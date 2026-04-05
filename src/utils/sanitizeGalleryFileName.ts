/** Nombre de archivo seguro para rutas en Storage (sin path traversal ni caracteres raros). */
export function sanitizeGalleryFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.length > 120 ? base.slice(0, 120) : base;
}
