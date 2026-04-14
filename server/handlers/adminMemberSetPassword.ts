import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromBearer, isCoordinatorAdmin } from '../lib/auth.js';
import { json } from '../lib/http.js';
import { parseJsonBuffer } from '../lib/parseBody.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';

const bodySchema = z.object({
  targetUserId: z.uuid(),
  newPassword: z.string().min(8).max(128),
});

export async function handleAdminMemberSetPassword(
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

  const { targetUserId, newPassword } = parsed.data;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.admin.updateUserById(targetUserId, { password: newPassword });
  if (error) {
    json(res, 400, { error: 'password_update_failed', message: error.message });
    return;
  }

  json(res, 200, { ok: true });
}
