import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
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

class BootstrapHttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface DbErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
}

interface ExistingUserRow {
  id: string;
  status: string;
  role: string;
}

function makeMemberId(): string {
  return `INTER-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function isUniqueViolation(error: DbErrorLike | null): boolean {
  return error?.code === '23505';
}

function getUniqueConstraint(error: DbErrorLike | null): string | null {
  if (!error) return null;
  const text = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  if (text.includes('users_member_id_key') || text.includes('(member_id)')) return 'users_member_id_key';
  if (text.includes('users_email_key') || text.includes('(email)')) return 'users_email_key';
  return null;
}

async function findUserByEmail(email: string): Promise<ExistingUserRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('users')
    .select('id,status,role')
    .eq('email', email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: String(data.id),
    status: String(data.status ?? ''),
    role: String(data.role ?? ''),
  };
}

async function handleEmailConflict(
  input: Readonly<{
    userId: string;
    email: string;
  }>
): Promise<'retry' | 'already_created'> {
  const supabase = getSupabaseAdmin();

  const { data: rowById, error: rowByIdError } = await supabase
    .from('users')
    .select('id')
    .eq('id', input.userId)
    .maybeSingle();
  if (rowByIdError) throw new Error(rowByIdError.message);
  if (rowById) return 'already_created';

  const rowByEmail = await findUserByEmail(input.email);
  if (!rowByEmail) return 'retry';
  if (rowByEmail.id === input.userId) return 'already_created';

  const { data: authLookup, error: authLookupError } = await supabase.auth.admin.getUserById(rowByEmail.id);
  if (authLookupError && !authLookupError.message.toLowerCase().includes('not found')) {
    throw new Error(authLookupError.message);
  }
  if (authLookup.user) {
    throw new BootstrapHttpError(
      409,
      'email_already_registered',
      'Este correo ya tiene una cuenta registrada. Intenta iniciar sesión o recuperar tu contraseña.'
    );
  }

  const canReclaimOrphan = rowByEmail.role !== 'coordinator_admin';
  if (!canReclaimOrphan) {
    throw new BootstrapHttpError(
      409,
      'email_conflict_requires_review',
      'Existe un registro anterior con este correo que requiere revisión de coordinación.'
    );
  }

  const { error: deleteError } = await supabase.from('users').delete().eq('id', rowByEmail.id);
  if (deleteError) {
    throw new Error(deleteError.message);
  }
  return 'retry';
}

async function ensureMemberProfile(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('member_profiles').insert({ user_id: userId });
  if (error && error.code !== '23505') {
    throw new Error(error.message);
  }
}

async function resolveUsersInsertConflict(
  input: Readonly<{ userId: string; email: string }>,
  insertError: DbErrorLike
): Promise<'retry' | 'already_created'> {
  if (!isUniqueViolation(insertError)) {
    throw new Error(insertError.message ?? 'users_insert_failed');
  }

  const uniqueConstraint = getUniqueConstraint(insertError);
  if (uniqueConstraint === 'users_member_id_key') {
    return 'retry';
  }

  return handleEmailConflict({ userId: input.userId, email: input.email });
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

  for (let i = 0; i < 12; i += 1) {
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

    const conflictResolution = await resolveUsersInsertConflict(
      { userId: input.userId, email: input.email },
      insertError
    );
    if (conflictResolution === 'already_created') return;
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

  const input = {
    ...parsed.data,
    email: normalizeEmail(parsed.data.email),
    fullName: parsed.data.fullName.trim(),
    phone: parsed.data.phone?.trim(),
  };
  const supabase = getSupabaseAdmin();

  const { data: authLookup, error: authLookupError } = await supabase.auth.admin.getUserById(input.userId);
  if (authLookupError || !authLookup.user) {
    json(res, 404, { error: 'auth_user_not_found', message: authLookupError?.message });
    return;
  }

  const authEmail = normalizeEmail(authLookup.user.email ?? '');
  if (!authEmail || authEmail !== input.email) {
    json(res, 409, { error: 'email_mismatch' });
    return;
  }

  try {
    await ensurePendingUserRow(input);
    await ensureMemberProfile(input.userId);
    json(res, 200, { ok: true });
  } catch (error) {
    if (error instanceof BootstrapHttpError) {
      json(res, error.status, { error: error.code, message: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : 'bootstrap_failed';
    json(res, 500, { error: 'bootstrap_failed', message });
  }
}
