import { supabase } from './supabaseClient';
import type { BarraGalleryItem } from '../types';
import { sanitizeGalleryFileName } from '../utils/sanitizeGalleryFileName';

const BUCKET_ID = 'barra-gallery';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** Miniatura para grillas (~320px lógicos × 2 retina). Requiere Storage Image Transformations (Supabase Pro). */
const GRID_THUMB_WIDTH = 640;
const GRID_THUMB_HEIGHT = 640;

function isGifStoragePath(storagePath: string): boolean {
  const fileName = storagePath.split('/').pop() ?? '';
  return /\.gif$/i.test(fileName);
}

/**
 * Desactiva transformaciones con `VITE_GALLERY_IMAGE_TRANSFORMS=false` (p. ej. plan sin Image Transformations).
 */
function galleryImageTransformsEnabled(): boolean {
  return import.meta.env.VITE_GALLERY_IMAGE_TRANSFORMS !== 'false';
}

function resolveGalleryPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET_ID).getPublicUrl(storagePath);
  return data.publicUrl;
}

export const galleryService = {
  /**
   * URL del archivo original (p. ej. vista ampliada / lightbox).
   */
  getPublicUrl(storagePath: string): string {
    return resolveGalleryPublicUrl(storagePath);
  },

  /**
   * URL optimizada para miniaturas en grilla (resize + calidad vía CDN de Supabase).
   * Los GIF se sirven sin transformar para conservar animación.
   * @see https://supabase.com/docs/guides/storage/serving/image-transformations
   */
  getGridDisplayUrl(storagePath: string): string {
    if (!galleryImageTransformsEnabled() || isGifStoragePath(storagePath)) {
      return resolveGalleryPublicUrl(storagePath);
    }

    const { data } = supabase.storage.from(BUCKET_ID).getPublicUrl(storagePath, {
      transform: {
        width: GRID_THUMB_WIDTH,
        height: GRID_THUMB_HEIGHT,
        resize: 'cover',
        quality: 78,
      },
    });
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
