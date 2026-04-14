import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromBearer, isCoordinatorAdmin } from '../lib/auth.js';
import { json } from '../lib/http.js';
import { parseJsonBuffer } from '../lib/parseBody.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';

const bodySchema = z.object({
  targetUserId: z.uuid(),
});

async function isCoordinatorAdminRole(supabase: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data, error } = await supabase.from('users').select('role').eq('id', userId).maybeSingle();
  if (error || !data) return false;
  return data.role === 'coordinator_admin';
}

async function countCoordinatorAdmins(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<number> {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'coordinator_admin');
  if (error) return 0;
  return count ?? 0;
}

export async function handleAdminMemberDelete(
  req: VercelRequest,
  res: VercelResponse,
  rawBody: Buffer
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  const actor = await getUserFromBearer(req.headers.authorization);
  if (!actor) {
    json(res, 401, { error: 'unauthorized' });
    return;
  }

  const allowed = await isCoordinatorAdmin(actor.id);
  if (!allowed) {
    json(res, 403, { error: 'forbidden' });
    return;
  }

  const parsed = bodySchema.safeParse(parseJsonBuffer(rawBody));
  if (!parsed.success) {
    json(res, 400, { error: 'invalid_body', message: parsed.error.message });
    return;
  }

  const { targetUserId } = parsed.data;
  if (targetUserId === actor.id) {
    json(res, 400, { error: 'cannot_delete_self' });
    return;
  }

  const supabase = getSupabaseAdmin();
  const targetIsAdmin = await isCoordinatorAdminRole(supabase, targetUserId);
  if (targetIsAdmin && (await countCoordinatorAdmins(supabase)) <= 1) {
    json(res, 400, { error: 'cannot_delete_last_admin' });
    return;
  }

  const { error: deleteRowError } = await supabase.from('users').delete().eq('id', targetUserId);
  if (deleteRowError) {
    json(res, 500, { error: 'delete_profile_failed', message: deleteRowError.message });
    return;
  }

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(targetUserId);
  if (deleteAuthError) {
    json(res, 500, { error: 'delete_auth_failed', message: deleteAuthError.message });
    return;
  }

  json(res, 200, { ok: true });
}
