import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromBearer, isCoordinatorAdmin } from '../lib/auth.js';
import { requireSmtpEnv } from '../lib/env.js';
import { json } from '../lib/http.js';
import { sendMarketingEmail } from '../lib/mailer.js';
import { parseJsonBuffer } from '../lib/parseBody.js';

const MAX_RECIPIENTS = 80;

const bodySchema = z.object({
  recipients: z.array(z.string().email()).min(1).max(MAX_RECIPIENTS),
  subject: z.string().min(1).max(200),
  html: z.string().min(1).max(500_000),
  text: z.string().max(500_000).optional(),
});

export async function handleSendBroadcast(
  req: VercelRequest,
  res: VercelResponse,
  rawBody: Buffer
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  try {
    requireSmtpEnv();
  } catch {
    json(res, 503, { error: 'smtp_not_configured' });
    return;
  }

  const user = await getUserFromBearer(req.headers.authorization);
  if (!user) {
    json(res, 401, { error: 'unauthorized' });
    return;
  }

  const allowed = await isCoordinatorAdmin(user.id);
  if (!allowed) {
    json(res, 403, { error: 'forbidden' });
    return;
  }

  const parsed = bodySchema.safeParse(parseJsonBuffer(rawBody));
  if (!parsed.success) {
    json(res, 400, { error: 'invalid_body', details: parsed.error.flatten() });
    return;
  }

  const { recipients, subject, html, text } = parsed.data;
  const { EMAIL_FROM } = requireSmtpEnv();

  let sent = 0;
  const failures: string[] = [];

  for (const to of recipients) {
    try {
      await sendMarketingEmail({ to, subject, html, text, from: EMAIL_FROM });
      sent += 1;
    } catch {
      failures.push(to);
    }
  }

  json(res, 200, {
    sent,
    failed: failures.length,
    failedRecipients: failures,
  });
}
