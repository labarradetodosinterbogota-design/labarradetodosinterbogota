import { supabase } from './supabaseClient';
import { sanitizeGalleryFileName } from '../utils/sanitizeGalleryFileName';

const BUCKET_ID = 'voting-option-images';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const votingOptionMediaService = {
  getPublicUrl(storagePath: string): string {
    const { data } = supabase.storage.from(BUCKET_ID).getPublicUrl(storagePath);
    return data.publicUrl;
  },

  async uploadOptionImage(file: File, userId: string): Promise<{ storagePath: string; publicUrl: string }> {
    if (!ALLOWED_MIME.has(file.type)) {
      throw new Error('Formato no permitido. Usa JPEG, PNG, WebP o GIF.');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('La imagen de opción no puede superar 5 MB.');
    }

    const safeName = sanitizeGalleryFileName(file.name) || 'opcion.jpg';
    const storagePath = `${userId}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage.from(BUCKET_ID).upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;

    return {
      storagePath,
      publicUrl: votingOptionMediaService.getPublicUrl(storagePath),
    };
  },
};
