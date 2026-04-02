import { supabase } from './supabaseClient';

export async function startContributionCheckout(amountCop: number): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Debes iniciar sesión para aportar.');
  }

  const origin = window.location.origin;
  const res = await fetch('/api/payments/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      amountCop,
      successUrl: `${origin}/contribute?thanks=1`,
      cancelUrl: `${origin}/contribute?canceled=1`,
    }),
  });

  const payload = (await res.json()) as { url?: string; error?: string; message?: string };
  if (!res.ok) {
    throw new Error(payload.message || payload.error || 'No se pudo iniciar el pago.');
  }
  if (!payload.url) {
    throw new Error('Respuesta inválida del servidor de pagos.');
  }
  return payload.url;
}
