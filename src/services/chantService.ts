import { supabase } from './supabaseClient';
import { Chant, PaginatedResponse } from '../types';
import { runExactCount } from '../utils/supabaseExactCount';
import { sanitizeIlikeSearchInput } from '../utils/sanitizeSearch';

export const chantService = {
  async getApproved(page = 1, limit = 10): Promise<PaginatedResponse<Chant>> {
    const offset = (page - 1) * limit;

    const total = await runExactCount('chants', (q) => q.eq('status', 'approved'));

    const { data, error } = await supabase
      .from('chants')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
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

  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<Chant>> {
    const offset = (page - 1) * limit;

    const total = await runExactCount('chants', (q) => q);

    const { data, error } = await supabase
      .from('chants')
      .select('*')
      .order('created_at', { ascending: false })
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

  async search(query: string, page = 1, limit = 10): Promise<PaginatedResponse<Chant>> {
    const safeQuery = sanitizeIlikeSearchInput(query);
    if (!safeQuery) {
      return { data: [], total: 0, page, limit, total_pages: 0 };
    }

    const offset = (page - 1) * limit;
    const pattern = `%${safeQuery}%`;

    const total = await runExactCount('chants', (q) =>
      q.eq('status', 'approved').or(`title.ilike.${pattern},lyrics.ilike.${pattern}`)
    );

    const { data, error } = await supabase
      .from('chants')
      .select('*')
      .eq('status', 'approved')
      .or(`title.ilike.${pattern},lyrics.ilike.${pattern}`)
      .order('created_at', { ascending: false })
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

  async create(
    chant: Omit<Chant, 'id' | 'created_at' | 'updated_at' | 'created_by'>,
    userId: string
  ): Promise<Chant> {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('chants')
      .insert({
        ...chant,
        created_by: userId,
        updated_at: nowIso,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Chant>): Promise<Chant> {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('chants')
      .update({ ...updates, updated_at: nowIso })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('chants').delete().eq('id', id);
    if (error) throw error;
  },
};
