import { useQuery } from '@tanstack/react-query';
import { memberService } from '../services/memberService';
import { User, PaginatedResponse } from '../types';

export const useMembers = (page: number = 1, limit: number = 10) => {
  return useQuery<PaginatedResponse<User>>({
    queryKey: ['members', page, limit],
    queryFn: () => memberService.getAll(page, limit),
  });
};

export const useMemberSearch = (query: string, page: number = 1, limit: number = 10) => {
  return useQuery<PaginatedResponse<User>>({
    queryKey: ['members-search', query, page, limit],
    queryFn: () => memberService.search(query, page, limit),
    enabled: query.length > 0,
  });
};

export const useMember = (id: string) => {
  return useQuery<User>({
    queryKey: ['member', id],
    queryFn: () => memberService.getById(id),
  });
};
