import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromBearer } from '../lib/auth.js';
import { getAppBaseUrl, getMercadoPagoWebhookSecret, requireMercadoPagoEnv } from '../lib/env.js';
import { json } from '../lib/http.js';
import { createMercadoPagoPreference } from '../lib/mercadopagoApi.js';
import { parseJsonBuffer } from '../lib/parseBody.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';

const bodySchema = z.object({
  amountCop: z.number().int().min(3_000).max(200_000_000),
  successUrl: z.string().url(),
  failureUrl: z.string().url(),
  pendingUrl: z.string().url(),
  payerEmail: z.string().email().optional(),
  donorPublicName: z.string().trim().max(80).optional(),
});

function sanitizeDonorName(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim().slice(0, 80);
  return t.length > 0 ? t : null;
}

export async function handleCreateMercadoPagoPreference(
  req: VercelRequest,
  res: VercelResponse,
  rawBody: Buffer
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  try {
    requireMercadoPagoEnv();
  } catch {
    json(res, 503, { error: 'mercadopago_not_configured', message: 'Configure MERCADOPAGO_ACCESS_TOKEN.' });
    return;
  }

  const raw = parseJsonBuffer(rawBody);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    json(res, 400, { error: 'invalid_body', details: parsed.error.flatten() });
    return;
  }

  const { amountCop, successUrl, failureUrl, pendingUrl, payerEmail, donorPublicName } = parsed.data;
  const authUser = await getUserFromBearer(req.headers.authorization);
  const donorName = sanitizeDonorName(donorPublicName);

  const { MERCADOPAGO_ACCESS_TOKEN } = requireMercadoPagoEnv();
  const supabase = getSupabaseAdmin();
  const baseUrl = getAppBaseUrl();
  const webhookSecret = getMercadoPagoWebhookSecret();
  const secretQuery = webhookSecret ? `?secret=${encodeURIComponent(webhookSecret)}` : '';
  const notificationUrl = `${baseUrl}/api/webhooks/mercadopago${secretQuery}`;

  const { data: row, error: insertError } = await supabase
    .from('contributions')
    .insert({
      user_id: authUser?.id ?? null,
      amount_cents: amountCop,
      currency: 'cop',
      status: 'pending',
      provider: 'mercadopago',
      payer_email: payerEmail?.trim() || null,
      donor_public_name: donorName,
      metadata: {
        source: 'checkout_pro',
        ...(authUser?.id ? { supabase_user_id: authUser.id } : {}),
      },
    })
    .select('id')
    .single();

  if (insertError || !row?.id) {
    if (process.env.NODE_ENV === 'development') {
      console.error('contributions insert', insertError);
    }
    json(res, 500, { error: 'db_error', message: insertError?.message });
    return;
  }

  const contributionId = row.id as string;

  try {
    const preference = await createMercadoPagoPreference({
      accessToken: MERCADOPAGO_ACCESS_TOKEN,
      externalReference: contributionId,
      amountCop,
      title: 'Donación — Barra Popular Legión Bacatá Inter Bogotá',
      notificationUrl,
      successUrl,
      failureUrl,
      pendingUrl,
      payerEmail: payerEmail?.trim() || undefined,
    });

    const { error: updateError } = await supabase
      .from('contributions')
      .update({
        mercadopago_preference_id: preference.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contributionId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    json(res, 200, { url: preference.init_point, preferenceId: preference.id, contributionId });
  } catch (e) {
    await supabase.from('contributions').delete().eq('id', contributionId);
    const message = e instanceof Error ? e.message : 'mercadopago_error';
    json(res, 502, { error: 'mercadopago_error', message });
  }
}
