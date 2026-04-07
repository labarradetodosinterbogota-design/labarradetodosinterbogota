import { getSupabaseUrl, supabase } from './supabaseClient';
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
const VOTING_OPTION_IMAGES_BUCKET = 'voting-option-images';
const VOTING_OPTION_IMAGES_PUBLIC_PATH_SEGMENT = `/storage/v1/object/public/${VOTING_OPTION_IMAGES_BUCKET}/`;

function extractVotingOptionStoragePath(imageUrl: string): string | null {
  const normalizedUrl = imageUrl.trim();
  if (normalizedUrl.length === 0) return null;

  try {
    const parsedUrl = new URL(normalizedUrl);
    const segmentIndex = parsedUrl.pathname.indexOf(VOTING_OPTION_IMAGES_PUBLIC_PATH_SEGMENT);
    if (segmentIndex === -1) return null;
    const encodedPath = parsedUrl.pathname.slice(
      segmentIndex + VOTING_OPTION_IMAGES_PUBLIC_PATH_SEGMENT.length
    );
    if (encodedPath.length === 0) return null;
    return decodeURIComponent(encodedPath);
  } catch {
    const fallbackPrefix = `${getSupabaseUrl()}${VOTING_OPTION_IMAGES_PUBLIC_PATH_SEGMENT}`;
    if (!normalizedUrl.startsWith(fallbackPrefix)) return null;
    const encodedPath = normalizedUrl.slice(fallbackPrefix.length).split('?')[0];
    if (encodedPath.length === 0) return null;
    return decodeURIComponent(encodedPath);
  }
}

function extractImageStoragePathsFromOptions(optionsValue: unknown): string[] {
  if (!Array.isArray(optionsValue)) return [];
  const uniquePaths = new Set<string>();

  for (const option of optionsValue) {
    if (!option || typeof option !== 'object') continue;
    const imageUrl = (option as { image_url?: unknown }).image_url;
    if (typeof imageUrl !== 'string') continue;
    const storagePath = extractVotingOptionStoragePath(imageUrl);
    if (storagePath) uniquePaths.add(storagePath);
  }

  return Array.from(uniquePaths);
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

    const candidateStoragePaths = extractImageStoragePathsFromOptions(poll.options);

    const { error: deleteError } = await supabase
      .from('voting_polls')
      .delete()
      .eq('id', id);
    if (deleteError) throw deleteError;

    if (candidateStoragePaths.length === 0) return;

    try {
      const { data: remainingPolls, error: remainingPollsError } = await supabase
        .from('voting_polls')
        .select('options');
      if (remainingPollsError) throw remainingPollsError;

      const stillUsedPaths = new Set<string>();
      for (const remainingPoll of remainingPolls ?? []) {
        for (const path of extractImageStoragePathsFromOptions(remainingPoll.options)) {
          stillUsedPaths.add(path);
        }
      }

      const orphanPaths = candidateStoragePaths.filter((path) => !stillUsedPaths.has(path));
      if (orphanPaths.length === 0) return;

      const { error: storageError } = await supabase
        .storage
        .from(VOTING_OPTION_IMAGES_BUCKET)
        .remove(orphanPaths);
      if (storageError && import.meta.env.DEV) {
        console.warn('Voting option image cleanup warning:', storageError.message);
      }
    } catch (cleanupError) {
      if (import.meta.env.DEV) {
        console.warn('Voting option image cleanup skipped:', cleanupError);
      }
    }
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
