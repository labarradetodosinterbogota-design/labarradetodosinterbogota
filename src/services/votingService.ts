import { supabase } from './supabaseClient';
import { VotingPoll, Vote, PaginatedResponse, VotingStatus } from '../types';
import { runExactCount } from '../utils/supabaseExactCount';

/** Row from `voting_polls` before vote aggregates are applied */
interface VotingPollDbRow {
  id: string;
  title: string;
  description: string | null;
  type: 'multiple_choice' | 'yes_no';
  options: Array<{ id: string; label: string; image_url?: string | null }>;
  start_date: string;
  end_date: string;
  quorum_required: number;
  total_members: number;
  status: VotingStatus;
  created_by: string;
  created_at: string;
}

type CreatePollInput = Omit<VotingPoll, 'id' | 'created_at' | 'total_votes' | 'total_members'>;
const PRIMARY_VOTING_OPTION_IMAGES_BUCKET = 'voting-option-images';
const FALLBACK_VOTING_OPTION_IMAGES_BUCKET = 'barra-gallery';
const VOTING_OPTIONS_FOLDER_PREFIX = 'voting-options/';
const VOTING_OPTION_IMAGE_SOURCES: ReadonlyArray<{
  bucketId: string;
  publicPathSegment: string;
}> = [
  {
    bucketId: PRIMARY_VOTING_OPTION_IMAGES_BUCKET,
    publicPathSegment: '/storage/v1/object/public/voting-option-images/',
  },
  {
    bucketId: FALLBACK_VOTING_OPTION_IMAGES_BUCKET,
    publicPathSegment: '/storage/v1/object/public/barra-gallery/',
  },
];

interface VotingOptionImageRef {
  bucketId: string;
  storagePath: string;
}

function buildImageRefKey(ref: VotingOptionImageRef): string {
  return `${ref.bucketId}|${ref.storagePath}`;
}

function extractVotingOptionStorageRef(imageUrl: string): VotingOptionImageRef | null {
  const normalizedUrl = imageUrl.trim();
  if (normalizedUrl.length === 0 || !normalizedUrl.startsWith('http')) return null;

  try {
    const parsedUrl = new URL(normalizedUrl);
    for (const source of VOTING_OPTION_IMAGE_SOURCES) {
      const segmentIndex = parsedUrl.pathname.indexOf(source.publicPathSegment);
      if (segmentIndex === -1) continue;

      const encodedPath = parsedUrl.pathname.slice(segmentIndex + source.publicPathSegment.length);
      if (encodedPath.length === 0) continue;

      const decodedPath = decodeURIComponent(encodedPath);
      const isFallbackWithoutPrefix =
        source.bucketId === FALLBACK_VOTING_OPTION_IMAGES_BUCKET &&
        !decodedPath.startsWith(VOTING_OPTIONS_FOLDER_PREFIX);
      if (isFallbackWithoutPrefix) {
        continue;
      }

      return {
        bucketId: source.bucketId,
        storagePath: decodedPath,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function extractImageStorageRefsFromOptions(optionsValue: unknown): VotingOptionImageRef[] {
  if (!Array.isArray(optionsValue)) return [];
  const uniqueRefs = new Map<string, VotingOptionImageRef>();

  for (const option of optionsValue) {
    if (!option || typeof option !== 'object') continue;
    const imageUrl = (option as { image_url?: unknown }).image_url;
    if (typeof imageUrl !== 'string') continue;
    const ref = extractVotingOptionStorageRef(imageUrl);
    if (!ref) continue;
    uniqueRefs.set(buildImageRefKey(ref), ref);
  }

  return Array.from(uniqueRefs.values());
}

function collectUsedImageRefKeys(
  polls: Array<{ options?: unknown }>
): Set<string> {
  const usedRefKeys = new Set<string>();
  for (const poll of polls) {
    for (const ref of extractImageStorageRefsFromOptions(poll.options)) {
      usedRefKeys.add(buildImageRefKey(ref));
    }
  }
  return usedRefKeys;
}

function groupStoragePathsByBucket(
  imageRefs: VotingOptionImageRef[]
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const ref of imageRefs) {
    const paths = grouped.get(ref.bucketId) ?? [];
    paths.push(ref.storagePath);
    grouped.set(ref.bucketId, paths);
  }
  return grouped;
}

async function cleanupOrphanVotingOptionImages(
  candidateImageRefs: VotingOptionImageRef[]
): Promise<void> {
  if (candidateImageRefs.length === 0) return;

  try {
    const { data: remainingPolls, error: remainingPollsError } = await supabase
      .from('voting_polls')
      .select('options');
    if (remainingPollsError) throw remainingPollsError;

    const stillUsedRefKeys = collectUsedImageRefKeys(remainingPolls ?? []);
    const orphanRefs = candidateImageRefs.filter(
      (ref) => !stillUsedRefKeys.has(buildImageRefKey(ref))
    );
    if (orphanRefs.length === 0) return;

    const storagePathsByBucket = groupStoragePathsByBucket(orphanRefs);
    for (const [bucketId, storagePaths] of storagePathsByBucket.entries()) {
      const { error: storageError } = await supabase.storage.from(bucketId).remove(storagePaths);
      if (storageError && import.meta.env.DEV) {
        console.warn('Voting option image cleanup warning:', storageError.message);
      }
    }
  } catch (cleanupError) {
    if (import.meta.env.DEV) {
      console.warn('Voting option image cleanup skipped:', cleanupError);
    }
  }
}

export const votingService = {
  async getActive(page = 1, limit = 10): Promise<PaginatedResponse<VotingPoll>> {
    const offset = (page - 1) * limit;

    const total = await runExactCount('voting_polls', (q) => q.eq('status', 'active'));

    const { data: polls, error: pollsError } = await supabase
      .from('voting_polls')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (pollsError) throw pollsError;

    const enrichedPolls = await Promise.all(
      (polls || []).map(async (poll) => {
        const votes = await votingService.getPollVotes(poll.id);
        return enrichPoll(poll, votes);
      })
    );

    return {
      data: enrichedPolls,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  },

  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<VotingPoll>> {
    const offset = (page - 1) * limit;

    const total = await runExactCount('voting_polls', (q) => q);

    const { data: polls, error: pollsError } = await supabase
      .from('voting_polls')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (pollsError) throw pollsError;

    const enrichedPolls = await Promise.all(
      (polls || []).map(async (poll) => {
        const votes = await votingService.getPollVotes(poll.id);
        return enrichPoll(poll, votes);
      })
    );

    return {
      data: enrichedPolls,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  },

  async getById(id: string): Promise<VotingPoll> {
    const { data, error } = await supabase
      .from('voting_polls')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    const votes = await votingService.getPollVotes(id);
    return enrichPoll(data, votes);
  },

  async create(poll: CreatePollInput, userId: string): Promise<VotingPoll> {
    const sanitizedOptions = poll.options.map((option) => ({
      id: option.id,
      label: option.label.trim(),
      image_url: option.image_url?.trim() || null,
    }));
    if (sanitizedOptions.length < 2) {
      throw new Error('Debes definir al menos dos opciones de votación.');
    }
    if (sanitizedOptions.some((option) => option.label.length === 0)) {
      throw new Error('Todas las opciones de votación deben tener etiqueta.');
    }

    const { data, error } = await supabase
      .from('voting_polls')
      .insert({
        ...poll,
        options: sanitizedOptions,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return enrichPoll(data, []);
  },

  async vote(pollId: string, userId: string, optionId: string): Promise<Vote> {
    const { data: existing } = await supabase
      .from('votes')
      .select('*')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('votes')
        .update({ selected_option: optionId })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('votes')
      .insert({
        poll_id: pollId,
        user_id: userId,
        selected_option: optionId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getPollVotes(pollId: string): Promise<Vote[]> {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('poll_id', pollId);

    if (error) throw error;
    return data || [];
  },

  async getUserVote(pollId: string, userId: string): Promise<Vote | null> {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async closePoll(id: string): Promise<VotingPoll> {
    const { data, error } = await supabase
      .from('voting_polls')
      .update({ status: 'closed' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const votes = await votingService.getPollVotes(id);
    return enrichPoll(data, votes);
  },

  async deletePoll(id: string): Promise<void> {
    const { data: poll, error: pollError } = await supabase
      .from('voting_polls')
      .select('id, options')
      .eq('id', id)
      .single();
    if (pollError) throw pollError;

    const candidateImageRefs = extractImageStorageRefsFromOptions(poll.options);

    const { error: deleteError } = await supabase
      .from('voting_polls')
      .delete()
      .eq('id', id);
    if (deleteError) throw deleteError;

    await cleanupOrphanVotingOptionImages(candidateImageRefs);
  },
};

function enrichPoll(poll: VotingPollDbRow, votes: Vote[]): VotingPoll {
  const voteCounts: Record<string, number> = {};
  const totalVotes = votes.length;
  const rawOptions = Array.isArray(poll.options) ? poll.options : [];

  votes.forEach((vote) => {
    voteCounts[vote.selected_option] = (voteCounts[vote.selected_option] || 0) + 1;
  });

  const enrichedOptions = rawOptions.map((option) => ({
    id: option.id,
    label: option.label,
    image_url: typeof option.image_url === 'string' ? option.image_url : null,
    vote_count: voteCounts[option.id] || 0,
    percentage: totalVotes > 0 ? ((voteCounts[option.id] || 0) / totalVotes) * 100 : 0,
  }));

  return {
    ...poll,
    options: enrichedOptions,
    total_votes: totalVotes,
  };
}
