import { supabase } from './supabaseClient';
import { UserRole, UserStatus, type User } from '../types';

export type MemberAdminProfilePatch = {
  full_name?: string;
  phone?: string | null;
  role?: UserRole;
  status?: UserStatus;
};

export const memberAdminService = {
  async countCoordinatorAdmins(): Promise<number> {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', UserRole.COORDINATOR_ADMIN);
    if (error) throw error;
    return count ?? 0;
  },

  async updateMemberFields(userId: string, patch: MemberAdminProfilePatch): Promise<void> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.full_name !== undefined) updates.full_name = patch.full_name.trim();
    if (patch.phone !== undefined) {
      const p = patch.phone;
      updates.phone = p === null || (typeof p === 'string' && p.trim() === '') ? null : p.trim();
    }
    if (patch.role !== undefined) updates.role = patch.role;
    if (patch.status !== undefined) updates.status = patch.status;

    const { error } = await supabase.from('users').update(updates).eq('id', userId);
    if (error) throw error;
  },

  async updateFanVerificationPath(userId: string, storagePath: string | null): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        fan_verification_storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (error) throw error;
  },

  async listPendingMembers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as User[];
  },

  async approveMember(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('status', 'pending');

    if (error) throw error;
  },

  async rejectMember(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('status', 'pending');

    if (error) throw error;
  },
};
