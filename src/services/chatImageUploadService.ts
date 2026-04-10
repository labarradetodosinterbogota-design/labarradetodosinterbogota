import { supabase } from './supabaseClient';

export const CHAT_IMAGES_BUCKET_ID = 'chat-images';

function extensionForContentType(contentType: string): string {
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  return 'jpg';
}

function mapStorageErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'No se pudo subir la imagen del chat.';
  }
  const message = error.message.toLowerCase();
  if (message.includes('bucket not found') || message.includes('does not exist')) {
    return 'No existe el bucket de imágenes del chat en Supabase. Aplica la migración de Storage.';
  }
  if (message.includes('row-level security') || message.includes('not allowed')) {
    return 'No tienes permiso para subir esta imagen. Verifica que tu cuenta esté activa.';
  }
  if (message.includes('size') || message.includes('too large')) {
    return 'La imagen comprimida sigue siendo demasiado grande. Prueba con otra foto.';
  }
  return error.message;
}

export const chatImageUploadService = {
  getPublicUrl(storagePath: string): string {
    const { data } = supabase.storage.from(CHAT_IMAGES_BUCKET_ID).getPublicUrl(storagePath);
    return data.publicUrl;
  },

  /**
   * Sube un blob ya comprimido bajo la carpeta del usuario (UUID en nombre para evitar colisiones).
   */
  async uploadCompressedImage(
    blob: Blob,
    userId: string,
    contentType: 'image/webp' | 'image/jpeg'
  ): Promise<string> {
    const extension = extensionForContentType(contentType);
    const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage.from(CHAT_IMAGES_BUCKET_ID).upload(storagePath, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType,
    });

    if (error) {
      throw new Error(mapStorageErrorMessage(error));
    }

    return storagePath;
  },
};
