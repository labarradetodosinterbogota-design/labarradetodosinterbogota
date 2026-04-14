import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readRequestBodyBuffer } from '../server/lib/readBody.js';
import { json } from '../server/lib/http.js';
import { handleAggregateStats } from '../server/handlers/aggregateStats.js';
import { handleBootstrapPendingMember } from '../server/handlers/bootstrapPendingMember.js';
import { handleCreateCheckoutSession } from '../server/handlers/createCheckoutSession.js';
import { handleCreateMercadoPagoPreference } from '../server/handlers/createMercadoPagoPreference.js';
import { handleMercadoPagoWebhook } from '../server/handlers/mercadopagoWebhook.js';
import { handleSendBroadcast } from '../server/handlers/sendBroadcast.js';
import { handleSmsSend } from '../server/handlers/smsSend.js';
import { handleStripeWebhook } from '../server/handlers/stripeWebhook.js';
import { handleAdminMemberDelete } from '../server/handlers/adminMemberDelete.js';
import { handleAdminMemberSetPassword } from '../server/handlers/adminMemberSetPassword.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

function getEndpointKey(req: VercelRequest): string | null {
  if (typeof req.url !== 'string' || req.url.length === 0) {
    return null;
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const endpointValues = url.searchParams.getAll('e');
    const first = endpointValues[0];
    if (typeof first === 'string' && first.length > 0) return first;
    return null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const key = getEndpointKey(req);
  if (!key) {
    json(res, 400, { error: 'bad_request', message: 'Missing route' });
    return;
  }

  const method = req.method ?? 'GET';
  const needsBody = method === 'POST' || method === 'PUT' || method === 'PATCH';
  const bodyBuf = needsBody ? await readRequestBodyBuffer(req) : Buffer.alloc(0);

  switch (key) {
    case 'stripe-webhook':
      await handleStripeWebhook(req, res, bodyBuf);
      return;
    case 'mercadopago-webhook':
      await handleMercadoPagoWebhook(req, res, bodyBuf);
      return;
    case 'create-checkout-session':
      await handleCreateCheckoutSession(req, res, bodyBuf);
      return;
    case 'create-mercadopago-preference':
      await handleCreateMercadoPagoPreference(req, res, bodyBuf);
      return;
    case 'sms-send':
      await handleSmsSend(req, res, bodyBuf);
      return;
    case 'aggregate-stats':
      await handleAggregateStats(req, res);
      return;
    case 'send-broadcast':
      await handleSendBroadcast(req, res, bodyBuf);
      return;
    case 'bootstrap-pending-member':
      await handleBootstrapPendingMember(req, res, bodyBuf);
      return;
    case 'admin-member-set-password':
      await handleAdminMemberSetPassword(req, res, bodyBuf);
      return;
    case 'admin-member-delete':
      await handleAdminMemberDelete(req, res, bodyBuf);
      return;
    default:
      json(res, 404, { error: 'not_found', message: 'Unknown route' });
  }
}
