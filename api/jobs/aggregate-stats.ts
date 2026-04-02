import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromBearer, isCoordinatorAdmin } from '../lib/auth';
import { getCronSecret } from '../lib/env';
import { json } from '../lib/http';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';

/**
 * Agregaciones pesadas en servidor (no exponer lógica sensible al cliente).
 * Autorización: CRON_SECRET (Vercel Cron) o JWT de coordinator_admin.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  const cronSecret = getCronSecret();
  const auth = req.headers.authorization;
  let authorized = false;

  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    authorized = true;
  } else {
    const user = await getUserFromBearer(auth);
    if (user && (await isCoordinatorAdmin(user.id))) {
      authorized = true;
    }
  }

  if (!authorized) {
    json(res, 401, { error: 'unauthorized' });
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data: contributions, error: cErr } = await supabase
    .from('contributions')
    .select('amount_cents, status')
    .eq('status', 'succeeded');

  if (cErr) {
    json(res, 500, { error: 'query_failed', message: cErr.message });
    return;
  }

  const rows = contributions ?? [];
  const totalAmountCop = rows.reduce((acc, r) => acc + (r.amount_cents ?? 0), 0);

  const { count: memberCount, error: mErr } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true });

  if (mErr) {
    json(res, 500, { error: 'members_query_failed', message: mErr.message });
    return;
  }

  json(res, 200, {
    generatedAt: new Date().toISOString(),
    contributions: {
      succeededCount: rows.length,
      totalAmountCop,
    },
    members: {
      count: memberCount ?? 0,
    },
  });
}
