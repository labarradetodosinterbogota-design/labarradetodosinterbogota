import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromBearer } from '../lib/auth.js';
import { json } from '../lib/http.js';
import { getStripe, getDefaultCurrency } from '../lib/stripe.js';
import { requireStripeEnv } from '../lib/env.js';
import { getJsonBody } from '../lib/parseBody.js';

const bodySchema = z.object({
  amountCop: z.number().int().min(3_000).max(200_000_000),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  try {
    requireStripeEnv();
  } catch {
    json(res, 503, { error: 'payments_not_configured' });
    return;
  }

  const user = await getUserFromBearer(req.headers.authorization);
  if (!user) {
    json(res, 401, { error: 'unauthorized' });
    return;
  }

  const raw = getJsonBody(req);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    json(res, 400, { error: 'invalid_body', details: parsed.error.flatten() });
    return;
  }

  const { amountCop, successUrl, cancelUrl } = parsed.data;
  const currency = getDefaultCurrency();

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amountCop,
            product_data: {
              name: 'Auxilio / aporte — barra',
              description: 'Contribución voluntaria para la barra',
            },
          },
        },
      ],
    });

    if (!session.url) {
      json(res, 500, { error: 'no_checkout_url' });
      return;
    }

    json(res, 200, { url: session.url, sessionId: session.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'stripe_error';
    json(res, 502, { error: 'stripe_error', message });
  }
}
