import Stripe from 'stripe';
import { requireStripeEnv } from './env';

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    const { STRIPE_SECRET_KEY } = requireStripeEnv();
    stripe = new Stripe(STRIPE_SECRET_KEY);
  }
  return stripe;
}

export function getDefaultCurrency(): string {
  return (process.env.STRIPE_CURRENCY || 'cop').toLowerCase();
}
