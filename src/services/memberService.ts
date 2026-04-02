import { supabase } from './supabaseClient';
import { User, PaginatedResponse } from '../types';
import { runExactCount } from '../utils/supabaseExactCount';
import { sanitizeIlikeSearchInput } from '../utils/sanitizeSearch';

export const memberService = {
  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<User>> {
    const offset = (page - 1) * limit;

    const total = await runExactCount('users', (q) => q);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('join_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: data || [],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  },

  async getById(id: string): Promise<User> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();

    if (error) throw error;
    return data;
  },

  async search(query: string, page = 1, limit = 10): Promise<PaginatedResponse<User>> {
    const safeQuery = sanitizeIlikeSearchInput(query);
    if (!safeQuery) {
      return { data: [], total: 0, page, limit, total_pages: 0 };
    }

    const offset = (page - 1) * limit;
    const pattern = `%${safeQuery}%`;

    const total = await runExactCount('users', (q) =>
      q.or(`full_name.ilike.${pattern},member_id.ilike.${pattern}`)
    );

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`full_name.ilike.${pattern},member_id.ilike.${pattern}`)
      .order('join_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: data || [],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  },

  async updateProfile(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async uploadPhoto(userId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const filename = `${userId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('member-photos')
      .upload(filename, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('member-photos').getPublicUrl(filename);

    return data.publicUrl;
  },
};
