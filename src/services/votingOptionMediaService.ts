import { supabase } from './supabaseClient';
import { sanitizeGalleryFileName } from '../utils/sanitizeGalleryFileName';

const PRIMARY_BUCKET_ID = 'voting-option-images';
const FALLBACK_BUCKET_ID = 'barra-gallery';
const VOTING_OPTIONS_FOLDER_PREFIX = 'voting-options';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function mapStorageErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'No se pudo subir la imagen de opción.';
  }
  const message = error.message.toLowerCase();
  if (message.includes('bucket not found') || message.includes('does not exist')) {
    return 'No existe el bucket de imágenes de votación en Supabase. Verifica la migración de Storage.';
  }
  if (message.includes('row-level security') || message.includes('not allowed')) {
    return 'Tu usuario no tiene permisos para subir imágenes en Storage. Revisa políticas de Supabase.';
  }
  if (message.includes('mime') || message.includes('content type')) {
    return 'Formato de imagen no permitido por el bucket. Usa JPEG, PNG, WebP o GIF.';
  }
  return error.message;
}

export const votingOptionMediaService = {
  getPublicUrl(storagePath: string, bucketId = PRIMARY_BUCKET_ID): string {
    const { data } = supabase.storage.from(bucketId).getPublicUrl(storagePath);
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
    const storagePath = `${VOTING_OPTIONS_FOLDER_PREFIX}/${userId}/${Date.now()}-${safeName}`;

    const uploadToBucket = async (bucketId: string): Promise<{ storagePath: string; publicUrl: string }> => {
      const { error } = await supabase.storage.from(bucketId).upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      return {
        storagePath,
        publicUrl: votingOptionMediaService.getPublicUrl(storagePath, bucketId),
      };
    };

    try {
      return await uploadToBucket(PRIMARY_BUCKET_ID);
    } catch (primaryError) {
      if (import.meta.env.DEV) {
        console.warn('Primary voting option bucket upload failed, trying fallback bucket:', primaryError);
      }
    }

    try {
      return await uploadToBucket(FALLBACK_BUCKET_ID);
    } catch (fallbackError) {
      throw new Error(mapStorageErrorMessage(fallbackError));
    }
  },
};
