import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromBearer, isCoordinatorAdmin } from '../lib/auth.js';
import { json } from '../lib/http.js';
import { parseJsonBuffer } from '../lib/parseBody.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

const bodySchema = z.object({
  targetUserId: z.uuid(),
  newEmail: z.string().min(3).max(320),
});

export async function handleAdminMemberUpdateEmail(
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

  const trimmedInput = parsed.data.newEmail.trim();
  const emailValidation = z.email().safeParse(trimmedInput);
  if (!emailValidation.success) {
    json(res, 400, { error: 'invalid_email', message: 'El formato del correo no es válido.' });
    return;
  }

  const targetUserId = parsed.data.targetUserId;
  const newEmail = normalizeEmail(emailValidation.data);

  const supabase = getSupabaseAdmin();

  const { data: targetRow, error: targetErr } = await supabase
    .from('users')
    .select('email')
    .eq('id', targetUserId)
    .maybeSingle();

  if (targetErr) {
    json(res, 500, { error: 'lookup_failed', message: targetErr.message });
    return;
  }
  if (!targetRow) {
    json(res, 404, { error: 'user_not_found', message: 'Integrante no encontrado.' });
    return;
  }

  const currentNormalized = normalizeEmail(String(targetRow.email));
  if (newEmail === currentNormalized) {
    json(res, 200, { ok: true, email: newEmail });
    return;
  }

  const { data: otherRow } = await supabase.from('users').select('id').eq('email', newEmail).maybeSingle();
  if (otherRow && otherRow.id !== targetUserId) {
    json(res, 409, { error: 'email_in_use', message: 'Ese correo ya está registrado para otro integrante.' });
    return;
  }

  const { error: authError } = await supabase.auth.admin.updateUserById(targetUserId, { email: newEmail });
  if (authError) {
    json(res, 400, { error: 'auth_email_update_failed', message: authError.message });
    return;
  }

  const { error: dbError } = await supabase
    .from('users')
    .update({ email: newEmail, updated_at: new Date().toISOString() })
    .eq('id', targetUserId);

  if (dbError) {
    json(res, 500, { error: 'profile_email_update_failed', message: dbError.message });
    return;
  }

  json(res, 200, { ok: true, email: newEmail });
}
