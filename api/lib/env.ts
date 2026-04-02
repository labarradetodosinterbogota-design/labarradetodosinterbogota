import { z } from 'zod';

const baseSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_ANON_KEY: z.string().min(20),
});

export type BaseServerEnv = z.infer<typeof baseSchema>;

export function requireBaseEnv(): BaseServerEnv {
  const parsed = baseSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_ANON_KEY');
  }
  return parsed.data;
}

const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
});

export function requireStripeEnv(): z.infer<typeof stripeSchema> {
  const parsed = stripeSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error('Missing or invalid STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET');
  }
  return parsed.data;
}

const smtpSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z
    .string()
    .regex(/^\d+$/)
    .transform((s) => Number.parseInt(s, 10)),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
});

export type SmtpEnv = z.infer<typeof smtpSchema>;

export function requireSmtpEnv(): SmtpEnv {
  const parsed = smtpSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error('Missing SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, or EMAIL_FROM');
  }
  return parsed.data;
}

const twilioSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC'),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_FROM: z.string().min(1),
});

export function requireTwilioEnv(): z.infer<typeof twilioSchema> {
  const parsed = twilioSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error('Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM');
  }
  return parsed.data;
}

export function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET?.trim() || undefined;
}
