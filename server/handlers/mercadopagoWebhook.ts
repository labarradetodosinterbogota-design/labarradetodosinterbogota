import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMercadoPagoWebhookSecret, requireMercadoPagoEnv } from '../lib/env.js';
import { json } from '../lib/http.js';
import { parseJsonBuffer } from '../lib/parseBody.js';
import { extractMercadoPagoPaymentIdFromWebhook, getMercadoPagoPayment } from '../lib/mercadopagoApi.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';

function readSecretQuery(req: VercelRequest): string {
  if (typeof req.url !== 'string' || req.url.length === 0) {
    return '';
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const secretValues = url.searchParams.getAll('secret');
    const first = secretValues[0];
    return typeof first === 'string' ? first : '';
  } catch {
    return '';
  }
}

function validateWebhookSecret(req: VercelRequest): boolean {
  const expected = getMercadoPagoWebhookSecret();
  if (!expected) {
    return process.env.NODE_ENV !== 'production';
  }
  return readSecretQuery(req) === expected;
}

export async function handleMercadoPagoWebhook(
  req: VercelRequest,
  res: VercelResponse,
  rawBody: Buffer
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  if (!validateWebhookSecret(req)) {
    res.status(401).end('Unauthorized');
    return;
  }

  try {
    requireMercadoPagoEnv();
  } catch {
    json(res, 503, { error: 'mercadopago_not_configured' });
    return;
  }

  const body = parseJsonBuffer(rawBody);
  const paymentId = extractMercadoPagoPaymentIdFromWebhook(body);
  if (!paymentId) {
    json(res, 200, { received: true, ignored: true });
    return;
  }

  const { MERCADOPAGO_ACCESS_TOKEN } = requireMercadoPagoEnv();

  let payment;
  try {
    payment = await getMercadoPagoPayment(MERCADOPAGO_ACCESS_TOKEN, paymentId);
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('mercadopago get payment', e);
    }
    json(res, 502, { error: 'payment_fetch_failed' });
    return;
  }

  const externalRef = payment.external_reference?.trim();
  if (!externalRef) {
    json(res, 200, { received: true, ignored: true });
    return;
  }

  const statusMap: Record<string, string> = {
    approved: 'succeeded',
    accredited: 'succeeded',
    pending: 'pending',
    in_process: 'pending',
    rejected: 'failed',
    cancelled: 'failed',
    refunded: 'failed',
    charged_back: 'failed',
  };

  const nextStatus = statusMap[payment.status] ?? 'pending';
  const amountPesos =
    payment.transaction_amount != null && Number.isFinite(payment.transaction_amount)
      ? Math.round(payment.transaction_amount)
      : null;

  const supabase = getSupabaseAdmin();
  const paymentIdStr = String(payment.id);

  const { data: existing } = await supabase
    .from('contributions')
    .select('metadata')
    .eq('id', externalRef)
    .maybeSingle();

  const prevMeta =
    existing?.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
      ? (existing.metadata as Record<string, unknown>)
      : {};

  const updatePayload: Record<string, unknown> = {
    mercadopago_payment_id: paymentIdStr,
    status: nextStatus,
    updated_at: new Date().toISOString(),
    metadata: {
      ...prevMeta,
      mp_status: payment.status,
      mp_currency: payment.currency_id,
    },
  };

  if (amountPesos != null) {
    updatePayload.amount_cents = amountPesos;
  }

  const { error } = await supabase
    .from('contributions')
    .update(updatePayload)
    .eq('id', externalRef)
    .eq('provider', 'mercadopago');

  if (error && process.env.NODE_ENV === 'development') {
    console.error('contributions mp webhook update', error);
  }

  json(res, 200, { received: true });
}
