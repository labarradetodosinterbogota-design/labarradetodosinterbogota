import { supabase } from './supabaseClient';

export interface StartMercadoPagoDonationInput {
  amountCop: number;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  payerEmail?: string;
  donorPublicName?: string;
}

export async function startMercadoPagoDonation(input: StartMercadoPagoDonationInput): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const res = await fetch('/api/payments/create-mercadopago-preference', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amountCop: input.amountCop,
      successUrl: input.successUrl,
      failureUrl: input.failureUrl,
      pendingUrl: input.pendingUrl,
      payerEmail: input.payerEmail?.trim() || undefined,
      donorPublicName: input.donorPublicName?.trim() || undefined,
    }),
  });

  const payload = (await res.json()) as { url?: string; error?: string; message?: string };
  if (!res.ok) {
    throw new Error(payload.message || payload.error || 'No se pudo iniciar el pago con Mercado Pago.');
  }
  if (!payload.url) {
    throw new Error('Respuesta inválida del servidor de pagos.');
  }
  return payload.url;
}
