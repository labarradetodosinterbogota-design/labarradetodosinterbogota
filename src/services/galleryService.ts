import { supabase } from './supabaseClient';
import type { BarraGalleryItem } from '../types';
import { sanitizeGalleryFileName } from '../utils/sanitizeGalleryFileName';

const BUCKET_ID = 'barra-gallery';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const galleryService = {
  getPublicUrl(storagePath: string): string {
    const { data } = supabase.storage.from(BUCKET_ID).getPublicUrl(storagePath);
    return data.publicUrl;
  },

  async listPublished(): Promise<BarraGalleryItem[]> {
    const { data, error } = await supabase
      .from('barra_gallery_items')
      .select('id, storage_path, caption, sort_order, created_by, created_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as BarraGalleryItem[];
  },

  async uploadImage(file: File, userId: string, caption: string | null): Promise<BarraGalleryItem> {
    if (!ALLOWED_MIME.has(file.type)) {
      throw new Error('Formato no permitido. Usa JPEG, PNG, WebP o GIF.');
    }
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error('La imagen no puede superar 5 MB.');
    }

    const safeName = sanitizeGalleryFileName(file.name) || 'foto.jpg';
    const storagePath = `${userId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_ID)
      .upload(storagePath, file, { cacheControl: '3600', upsert: false, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data: row, error: insertError } = await supabase
      .from('barra_gallery_items')
      .insert({
        storage_path: storagePath,
        caption: caption?.trim() || null,
        created_by: userId,
        sort_order: 0,
      })
      .select('id, storage_path, caption, sort_order, created_by, created_at')
      .single();

    if (insertError) {
      await supabase.storage.from(BUCKET_ID).remove([storagePath]);
      throw insertError;
    }

    return row as BarraGalleryItem;
  },

  async deleteItem(item: BarraGalleryItem): Promise<void> {
    const { error: dbError } = await supabase.from('barra_gallery_items').delete().eq('id', item.id);
    if (dbError) throw dbError;

    const { error: storageError } = await supabase.storage.from(BUCKET_ID).remove([item.storage_path]);
    if (storageError && import.meta.env.DEV) {
      console.warn('Storage remove warning:', storageError.message);
    }
  },
};
