import type { VercelRequest, VercelResponse } from '@vercel/node';
import type Stripe from 'stripe';
import { requireStripeEnv } from '../lib/env';
import { getStripe } from '../lib/stripe';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';
import { json } from '../lib/http';

/** Si despliegas con Next.js, desactiva el parser del body aquí; en Vercel + `/api` puede aplicarse según runtime. */
export const config = {
  api: {
    bodyParser: false,
  },
};

function readRequestBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: string | Buffer) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  const { STRIPE_WEBHOOK_SECRET } = requireStripeEnv();
  const sig = req.headers['stripe-signature'];
  if (!sig || Array.isArray(sig)) {
    res.status(400).end('Missing stripe-signature');
    return;
  }

  let event: Stripe.Event;
  try {
    const rawBody = await readRequestBody(req);
    if (rawBody.length === 0) {
      res.status(400).end('Empty body');
      return;
    }
    event = getStripe().webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    res.status(400).end(`Webhook Error: ${err instanceof Error ? err.message : 'invalid'}`);
    return;
  }

  const supabase = getSupabaseAdmin();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id ?? null;
        const pi =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

        const { error } = await supabase.from('contributions').upsert(
          {
            user_id: userId,
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: pi,
            amount_cents: session.amount_total ?? 0,
            currency: session.currency ?? 'cop',
            status: 'succeeded',
            metadata: { ...(session.metadata ?? {}) },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'stripe_checkout_session_id' }
        );

        if (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('contributions upsert', error);
          }
          json(res, 500, { error: 'db_error' });
          return;
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const { error } = await supabase
          .from('contributions')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', intent.id);
        if (error && process.env.NODE_ENV === 'development') {
          console.error('payment_intent.payment_failed update', error);
        }
        break;
      }
      default:
        break;
    }
  } catch {
    json(res, 500, { error: 'handler_error' });
    return;
  }

  json(res, 200, { received: true });
}
