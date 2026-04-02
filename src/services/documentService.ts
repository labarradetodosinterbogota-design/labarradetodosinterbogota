import { supabase } from './supabaseClient';
import { Document, PaginatedResponse } from '../types';
import { runExactCount } from '../utils/supabaseExactCount';

export const documentService = {
  async getPublic(page = 1, limit = 10): Promise<PaginatedResponse<Document>> {
    const offset = (page - 1) * limit;

    const total = await runExactCount('documents', (q) => q.eq('is_public', true));

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('is_public', true)
      .order('uploaded_at', { ascending: false })
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

  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<Document>> {
    const offset = (page - 1) * limit;

    const total = await runExactCount('documents', (q) => q);

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('uploaded_at', { ascending: false })
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

  async getByCategory(category: string, page = 1, limit = 10): Promise<PaginatedResponse<Document>> {
    const offset = (page - 1) * limit;

    const total = await runExactCount('documents', (q) => q.eq('category', category));

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('category', category)
      .order('uploaded_at', { ascending: false })
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
    document: Omit<Document, 'id' | 'uploaded_at'>,
    userId: string
  ): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        ...document,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw error;
  },

  async uploadFile(file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filename, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('documents').getPublicUrl(filename);

    return data.publicUrl;
  },
};
