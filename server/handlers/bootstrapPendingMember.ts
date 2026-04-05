import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { json } from '../lib/http.js';
import { parseJsonBuffer } from '../lib/parseBody.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';

const bodySchema = z.object({
  userId: z.uuid(),
  email: z.email(),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional(),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function makeMemberId(): string {
  const suffix = Math.floor(Math.random() * 10_000)
    .toString()
    .padStart(4, '0');
  return `INTER-${Date.now()}-${suffix}`;
}

async function ensureMemberProfile(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('member_profiles').insert({ user_id: userId });
  if (error && error.code !== '23505') {
    throw new Error(error.message);
  }
}

async function ensurePendingUserRow(
  input: Readonly<{
    userId: string;
    email: string;
    fullName: string;
    phone?: string;
  }>
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: existingRow, error: existingError } = await supabase
    .from('users')
    .select('id')
    .eq('id', input.userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingRow) {
    return;
  }

  for (let i = 0; i < 5; i += 1) {
    const memberId = makeMemberId();
    const { error: insertError } = await supabase.from('users').insert({
      id: input.userId,
      email: input.email,
      phone: input.phone?.trim() || null,
      full_name: input.fullName,
      member_id: memberId,
      status: 'pending',
    });

    if (!insertError) {
      return;
    }

    if (insertError.code === '23505') {
      const { data: rowAfterConflict, error: rowAfterConflictError } = await supabase
        .from('users')
        .select('id')
        .eq('id', input.userId)
        .maybeSingle();

      if (rowAfterConflictError) {
        throw new Error(rowAfterConflictError.message);
      }
      if (rowAfterConflict) {
        return;
      }
      continue;
    }

    throw new Error(insertError.message);
  }

  throw new Error('No se pudo generar un member_id único para el nuevo integrante.');
}

export async function handleBootstrapPendingMember(
  req: VercelRequest,
  res: VercelResponse,
  rawBody: Buffer
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  const body = parseJsonBuffer(rawBody);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    json(res, 400, { error: 'invalid_body', details: parsed.error.issues });
    return;
  }

  const input = parsed.data;
  const supabase = getSupabaseAdmin();

  const { data: authLookup, error: authLookupError } = await supabase.auth.admin.getUserById(input.userId);
  if (authLookupError || !authLookup.user) {
    json(res, 404, { error: 'auth_user_not_found', message: authLookupError?.message });
    return;
  }

  const authEmail = normalizeEmail(authLookup.user.email ?? '');
  if (!authEmail || authEmail !== normalizeEmail(input.email)) {
    json(res, 409, { error: 'email_mismatch' });
    return;
  }

  try {
    await ensurePendingUserRow(input);
    await ensureMemberProfile(input.userId);
    json(res, 200, { ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'bootstrap_failed';
    json(res, 500, { error: 'bootstrap_failed', message });
  }
}
