/**
 * Convierte un enlace público de post, reel o TV de Instagram en la URL de embed oficial.
 * Solo acepta host instagram.com / www.instagram.com.
 */
export function buildInstagramEmbedSrc(permalink: string): string | null {
  const trimmed = permalink.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();
    if (host !== 'instagram.com' && host !== 'www.instagram.com') {
      return null;
    }
    const path = u.pathname.replace(/\/$/, '');
    if (!/^\/(p|reel|tv)\/[^/]+\/?$/.test(path)) {
      return null;
    }
    return `https://www.instagram.com${path}/embed`;
  } catch {
    return null;
  }
}
