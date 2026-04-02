import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { requireBaseEnv } from './env.js';
import { getSupabaseAdmin } from './supabaseAdmin.js';

export async function getUserFromBearer(authorization: string | undefined): Promise<User | null> {
  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const jwt = authorization.slice(7).trim();
  if (!jwt) return null;

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = requireBaseEnv();
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) return null;
  return data.user;
}

export async function isCoordinatorAdmin(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('users').select('role').eq('id', userId).maybeSingle();
  if (error || !data) return false;
  return data.role === 'coordinator_admin';
}
