import { supabase } from './supabaseClient';
import { VotingPoll, Vote, PaginatedResponse, VotingStatus } from '../types';
import { runExactCount } from '../utils/supabaseExactCount';

/** Row from `voting_polls` before vote aggregates are applied */
interface VotingPollDbRow {
  id: string;
  title: string;
  description: string | null;
  type: 'multiple_choice' | 'yes_no';
  options: Array<{ id: string; label: string }>;
  start_date: string;
  end_date: string;
  quorum_required: number;
  total_members: number;
  status: VotingStatus;
  created_by: string;
  created_at: string;
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

  async create(poll: Omit<VotingPoll, 'id' | 'created_at' | 'total_votes' | 'total_members'>, userId: string): Promise<VotingPoll> {
    const { data, error } = await supabase
      .from('voting_polls')
      .insert({
        ...poll,
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
};

function enrichPoll(poll: VotingPollDbRow, votes: Vote[]): VotingPoll {
  const voteCounts: Record<string, number> = {};
  const totalVotes = votes.length;

  votes.forEach((vote) => {
    voteCounts[vote.selected_option] = (voteCounts[vote.selected_option] || 0) + 1;
  });

  const enrichedOptions = poll.options.map((option) => ({
    ...option,
    vote_count: voteCounts[option.id] || 0,
    percentage: totalVotes > 0 ? ((voteCounts[option.id] || 0) / totalVotes) * 100 : 0,
  }));

  return {
    ...poll,
    options: enrichedOptions,
    total_votes: totalVotes,
  };
}
