import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chantService } from '../services/chantService';
import { Chant, PaginatedResponse } from '../types';

export const useChants = (page: number = 1, limit: number = 10) => {
  return useQuery<PaginatedResponse<Chant>>({
    queryKey: ['chants', page, limit],
    queryFn: () => chantService.getApproved(page, limit),
  });
};

export const useAllChants = (page: number = 1, limit: number = 10) => {
  return useQuery<PaginatedResponse<Chant>>({
    queryKey: ['all-chants', page, limit],
    queryFn: () => chantService.getAll(page, limit),
  });
};

export const useChantSearch = (query: string, page: number = 1, limit: number = 10) => {
  return useQuery<PaginatedResponse<Chant>>({
    queryKey: ['chants-search', query, page, limit],
    queryFn: () => chantService.search(query, page, limit),
    enabled: query.length > 0,
  });
};

export const useCreateChant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chant, userId }: { chant: Omit<Chant, 'id' | 'created_at' | 'updated_at'>; userId: string }) =>
      chantService.create(chant, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-chants'] });
      queryClient.invalidateQueries({ queryKey: ['chants'] });
    },
  });
};
