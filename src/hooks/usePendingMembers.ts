import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberAdminService } from '../services/memberAdminService';
import type { User } from '../types';

export const usePendingMembers = () => {
  return useQuery<User[]>({
    queryKey: ['pending-members'],
    queryFn: () => memberAdminService.listPendingMembers(),
  });
};

export const useRecentInactiveMembers = () => {
  return useQuery<User[]>({
    queryKey: ['recent-inactive-members'],
    queryFn: () => memberAdminService.listRecentInactiveMembers(25),
  });
};

export const useApproveMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => memberAdminService.approveMember(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pending-members'] });
      void queryClient.invalidateQueries({ queryKey: ['recent-inactive-members'] });
    },
  });
};

export const useRejectMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => memberAdminService.rejectMember(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pending-members'] });
      void queryClient.invalidateQueries({ queryKey: ['recent-inactive-members'] });
    },
  });
};
