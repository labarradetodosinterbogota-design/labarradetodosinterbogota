import { supabase } from './supabaseClient';

export interface AdminDashboardStatsPayload {
  generatedAt: string;
  contributions: {
    succeededCount: number;
    totalAmountCop: number;
  };
  members: {
    count: number;
    pendingCount: number;
    activeCount: number;
  };
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStatsPayload> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Sesión no válida.');
  }
  const res = await fetch('/api/jobs/aggregate-stats', {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const payload = (await res.json().catch(() => ({}))) as AdminDashboardStatsPayload & { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(payload.message || payload.error || 'No se pudieron cargar las estadísticas.');
  }
  return payload;
}

export function formatCopFromCents(cents: number): string {
  const cop = cents / 100;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(cop);
}
