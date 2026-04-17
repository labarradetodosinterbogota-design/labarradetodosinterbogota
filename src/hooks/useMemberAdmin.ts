import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminDeleteMember, adminSetMemberPassword, adminUpdateMemberEmail } from '../services/adminMemberClient';
import { memberAdminService, type MemberAdminProfilePatch } from '../services/memberAdminService';

export function useUpdateMemberAdminProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, patch }: { userId: string; patch: MemberAdminProfilePatch }) =>
      memberAdminService.updateMemberFields(userId, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members'] });
      void queryClient.invalidateQueries({ queryKey: ['members-search'] });
      void queryClient.invalidateQueries({ queryKey: ['pending-members'] });
      void queryClient.invalidateQueries({ queryKey: ['recent-inactive-members'] });
    },
  });
}

export function useAdminSetMemberPassword() {
  return useMutation({
    mutationFn: ({ targetUserId, newPassword }: { targetUserId: string; newPassword: string }) =>
      adminSetMemberPassword(targetUserId, newPassword),
  });
}

export function useAdminUpdateMemberEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ targetUserId, newEmail }: { targetUserId: string; newEmail: string }) =>
      adminUpdateMemberEmail(targetUserId, newEmail),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members'] });
      void queryClient.invalidateQueries({ queryKey: ['members-search'] });
      void queryClient.invalidateQueries({ queryKey: ['pending-members'] });
      void queryClient.invalidateQueries({ queryKey: ['recent-inactive-members'] });
    },
  });
}

export function useAdminDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => adminDeleteMember(targetUserId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members'] });
      void queryClient.invalidateQueries({ queryKey: ['members-search'] });
      void queryClient.invalidateQueries({ queryKey: ['pending-members'] });
      void queryClient.invalidateQueries({ queryKey: ['recent-inactive-members'] });
    },
  });
}
