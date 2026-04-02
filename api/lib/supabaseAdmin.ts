import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireBaseEnv } from './env.js';

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!cached) {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = requireBaseEnv();
    cached = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
