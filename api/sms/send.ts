import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import twilio from 'twilio';
import { getUserFromBearer, isCoordinatorAdmin } from '../lib/auth.js';
import { requireTwilioEnv } from '../lib/env.js';
import { json } from '../lib/http.js';
import { getJsonBody } from '../lib/parseBody.js';

const bodySchema = z.object({
  to: z.string().min(8).max(20),
  body: z.string().min(1).max(1400),
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  try {
    requireTwilioEnv();
  } catch {
    json(res, 503, { error: 'sms_not_configured' });
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

  const parsed = bodySchema.safeParse(getJsonBody(req));
  if (!parsed.success) {
    json(res, 400, { error: 'invalid_body', details: parsed.error.flatten() });
    return;
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = requireTwilioEnv();
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  try {
    const msg = await client.messages.create({
      from: TWILIO_FROM,
      to: parsed.data.to,
      body: parsed.data.body,
    });
    json(res, 200, { sid: msg.sid, status: msg.status });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'twilio_error';
    json(res, 502, { error: 'twilio_error', message });
  }
}
