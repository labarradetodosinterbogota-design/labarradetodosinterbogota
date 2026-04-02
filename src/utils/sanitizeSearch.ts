/**
 * Strips characters that widen ILIKE matches or break PostgREST `.or()` filter parsing.
 */
export function sanitizeIlikeSearchInput(raw: string): string {
  return raw.trim().replace(/[%_,()]/g, '');
}
