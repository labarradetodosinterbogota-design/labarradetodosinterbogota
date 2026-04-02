import { supabase } from '../services/supabaseClient';

/** Chained PostgREST builder: precise generics exceed TS recursion limits when used as a callback parameter. */
type CountQuery = {
  eq(column: string, value: unknown): CountQuery;
  gte(column: string, value: unknown): CountQuery;
  or(filters: string): CountQuery;
  then<TResult1 = { count: number | null; error: Error | null }, TResult2 = never>(
    onfulfilled?: ((value: { count: number | null; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
};

/**
 * Head-only count with the same filters as the paginated data query.
 * Uses Supabase `count: 'exact'` (not row array length).
 */
export async function runExactCount(
  table: string,
  applyFilters: (q: CountQuery) => CountQuery
): Promise<number> {
  const base = supabase.from(table).select('id', { count: 'exact', head: true }) as unknown as CountQuery;
  const built = applyFilters(base);
  const { count, error } = await built;
  if (error) throw error;
  return count ?? 0;
}
