import { supabase } from './supabaseClient';
import type { HomepageInstagramEmbedRow } from '../types';

const EMBEDS_TABLE = 'homepage_instagram_embeds';
const PROFILE_TABLE = 'homepage_instagram_profile';

async function listEmbedsOrdered(): Promise<HomepageInstagramEmbedRow[]> {
  const { data, error } = await supabase
    .from(EMBEDS_TABLE)
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as HomepageInstagramEmbedRow[];
}

export const homepageInstagramEmbedsService = {
  listEmbedsOrdered,

  async getProfileUrl(): Promise<string | null> {
    const { data, error } = await supabase.from(PROFILE_TABLE).select('profile_url').eq('id', 1).maybeSingle();
    if (error) throw error;
    const u = data?.profile_url;
    if (typeof u !== 'string') return null;
    const t = u.trim();
    return t.length > 0 ? t : null;
  },

  async saveProfileUrl(profileUrl: string | null): Promise<void> {
    const trimmed = profileUrl?.trim() || null;
    const now = new Date().toISOString();
    const { error } = await supabase.from(PROFILE_TABLE).upsert(
      { id: 1, profile_url: trimmed, updated_at: now },
      { onConflict: 'id' }
    );
    if (error) throw error;
  },

  async createEmbed(input: { title: string | null; permalink: string }): Promise<void> {
    const rows = await listEmbedsOrdered();
    const nextOrder = rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.sort_order)) + 1;
    const now = new Date().toISOString();
    const { error } = await supabase.from(EMBEDS_TABLE).insert({
      title: input.title?.trim() || null,
      permalink: input.permalink.trim(),
      sort_order: nextOrder,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
  },

  async updateEmbed(
    id: string,
    patch: { title?: string | null; permalink?: string }
  ): Promise<void> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) updates.title = patch.title?.trim() || null;
    if (patch.permalink !== undefined) updates.permalink = patch.permalink.trim();
    if (Object.keys(updates).length <= 1) {
      return;
    }
    const { error } = await supabase.from(EMBEDS_TABLE).update(updates).eq('id', id);
    if (error) throw error;
  },

  async deleteEmbed(id: string): Promise<void> {
    const { error } = await supabase.from(EMBEDS_TABLE).delete().eq('id', id);
    if (error) throw error;
    const remaining = await listEmbedsOrdered();
    const now = new Date().toISOString();
    for (let i = 0; i < remaining.length; i += 1) {
      const { error: uErr } = await supabase
        .from(EMBEDS_TABLE)
        .update({ sort_order: i, updated_at: now })
        .eq('id', remaining[i].id);
      if (uErr) throw uErr;
    }
  },

  async moveEmbed(id: string, direction: 'up' | 'down'): Promise<void> {
    const rows = await listEmbedsOrdered();
    const i = rows.findIndex((r) => r.id === id);
    const j = direction === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= rows.length) return;
    const reordered = [...rows];
    const tmp = reordered[i];
    reordered[i] = reordered[j];
    reordered[j] = tmp;
    const now = new Date().toISOString();
    for (let k = 0; k < reordered.length; k += 1) {
      const { error } = await supabase
        .from(EMBEDS_TABLE)
        .update({ sort_order: k, updated_at: now })
        .eq('id', reordered[k].id);
      if (error) throw error;
    }
  },
};
