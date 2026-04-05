export interface MercadoPagoPreferenceResult {
  id: string;
  init_point: string;
}

export interface MercadoPagoPaymentInfo {
  id: string | number;
  status: string;
  external_reference: string | null;
  transaction_amount: number | null;
  currency_id: string | null;
}

export async function createMercadoPagoPreference(
  input: Readonly<{
    accessToken: string;
    externalReference: string;
    amountCop: number;
    title: string;
    notificationUrl: string;
    successUrl: string;
    failureUrl: string;
    pendingUrl: string;
    payerEmail?: string;
  }>
): Promise<MercadoPagoPreferenceResult> {
  const body: Record<string, unknown> = {
    items: [
      {
        title: input.title,
        quantity: 1,
        unit_price: input.amountCop,
        currency_id: 'COP',
      },
    ],
    external_reference: input.externalReference,
    notification_url: input.notificationUrl,
    back_urls: {
      success: input.successUrl,
      failure: input.failureUrl,
      pending: input.pendingUrl,
    },
    auto_return: 'approved',
  };

  if (input.payerEmail?.trim()) {
    body.payer = { email: input.payerEmail.trim() };
  }

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `mercadopago_preferences_${res.status}`);
  }

  const data = (await res.json()) as { id?: string; init_point?: string };
  if (!data.init_point || !data.id) {
    throw new Error('invalid_mercadopago_preference_response');
  }
  return { id: data.id, init_point: data.init_point };
}

export async function getMercadoPagoPayment(
  accessToken: string,
  paymentId: string
): Promise<MercadoPagoPaymentInfo> {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `mercadopago_payment_${res.status}`);
  }

  const data = (await res.json()) as {
    id?: string | number;
    status?: string;
    external_reference?: string | null;
    transaction_amount?: number | null;
    currency_id?: string | null;
  };

  if (data.id == null || !data.status) {
    throw new Error('invalid_mercadopago_payment_response');
  }

  return {
    id: data.id,
    status: data.status,
    external_reference: data.external_reference ?? null,
    transaction_amount: data.transaction_amount ?? null,
    currency_id: data.currency_id ?? null,
  };
}

export function extractMercadoPagoPaymentIdFromWebhook(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;

  const data = o.data;
  if (data && typeof data === 'object' && data !== null) {
    const id = (data as Record<string, unknown>).id;
    if (typeof id === 'string' && id.length > 0) return id;
    if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  }

  const resource = o.resource;
  if (typeof resource === 'string') {
    const parts = resource.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^\d+$/.test(last)) return last;
  }

  if (typeof o.id === 'string' && /^\d+$/.test(o.id)) return o.id;
  if (typeof o.id === 'number' && Number.isFinite(o.id)) return String(o.id);

  return null;
}
