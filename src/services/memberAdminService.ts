import { supabase } from './supabaseClient';
import type { User } from '../types';

export const memberAdminService = {
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
