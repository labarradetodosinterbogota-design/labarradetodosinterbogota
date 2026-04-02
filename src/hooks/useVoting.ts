import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { votingService } from '../services/votingService';
import { VotingPoll, Vote, PaginatedResponse } from '../types';

export const useActiveVoting = (page: number = 1, limit: number = 10) => {
  return useQuery<PaginatedResponse<VotingPoll>>({
    queryKey: ['active-polls', page, limit],
    queryFn: () => votingService.getActive(page, limit),
  });
};

export const useAllVoting = (page: number = 1, limit: number = 10) => {
  return useQuery<PaginatedResponse<VotingPoll>>({
    queryKey: ['all-polls', page, limit],
    queryFn: () => votingService.getAll(page, limit),
  });
};

export const usePoll = (id: string) => {
  return useQuery<VotingPoll>({
    queryKey: ['poll', id],
    queryFn: () => votingService.getById(id),
  });
};

export const useUserVote = (pollId: string, userId: string | null) => {
  return useQuery<Vote | null>({
    queryKey: ['user-vote', pollId, userId],
    queryFn: () => votingService.getUserVote(pollId, userId!),
    enabled: !!userId,
  });
};

export const useVote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pollId, userId, optionId }: { pollId: string; userId: string; optionId: string }) =>
      votingService.vote(pollId, userId, optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-polls'] });
      queryClient.invalidateQueries({ queryKey: ['all-polls'] });
      queryClient.invalidateQueries({ queryKey: ['poll'] });
    },
  });
};

export const useCreatePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ poll, userId }: { poll: Omit<VotingPoll, 'id' | 'created_at' | 'total_votes' | 'total_members'>; userId: string }) =>
      votingService.create(poll, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-polls'] });
      queryClient.invalidateQueries({ queryKey: ['all-polls'] });
    },
  });
};
