import { supabase } from './supabaseClient';
import { sanitizeGalleryFileName } from '../utils/sanitizeGalleryFileName';

export const FAN_VERIFICATION_BUCKET = 'fan-verification';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadFanVerificationPhoto(userId: string, file: File): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error('La foto debe ser JPEG, PNG, WebP o GIF.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('La foto no puede superar 5 MB.');
  }

  const safe = sanitizeGalleryFileName(file.name) || 'hincha-inter.jpg';
  const path = `${userId}/fan-${Date.now()}-${safe}`;

  const { error } = await supabase.storage.from(FAN_VERIFICATION_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) throw error;
  return path;
}

export async function getFanVerificationSignedUrl(
  storagePath: string,
  expiresInSeconds = 600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(FAN_VERIFICATION_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function removeFanVerificationObjects(paths: readonly string[]): Promise<void> {
  const unique = [...new Set(paths.filter((p) => p.length > 0))];
  if (unique.length === 0) return;
  const { error } = await supabase.storage.from(FAN_VERIFICATION_BUCKET).remove([...unique]);
  if (error) throw error;
}
