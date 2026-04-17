import { supabase } from './supabaseClient';

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function readErrorMessage(payload: Record<string, unknown>, fallback: string): string {
  const msg = payload.message;
  if (typeof msg === 'string' && msg.trim().length > 0) return msg;
  const err = payload.error;
  if (typeof err === 'string' && err.trim().length > 0) return err;
  return fallback;
}

export async function adminSetMemberPassword(targetUserId: string, newPassword: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sesión no válida.');
  }
  const res = await fetch('/api/admin/members/set-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ targetUserId, newPassword }),
  });
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(readErrorMessage(payload, 'No se pudo actualizar la contraseña.'));
  }
}

export async function adminUpdateMemberEmail(targetUserId: string, newEmail: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sesión no válida.');
  }
  const res = await fetch('/api/admin/members/update-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ targetUserId, newEmail }),
  });
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const code = payload.error;
    if (code === 'email_in_use') {
      throw new Error(
        typeof payload.message === 'string' ? payload.message : 'Ese correo ya está en uso.'
      );
    }
    throw new Error(readErrorMessage(payload, 'No se pudo actualizar el correo.'));
  }
}

export async function adminDeleteMember(targetUserId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sesión no válida.');
  }
  const res = await fetch('/api/admin/members/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ targetUserId }),
  });
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const code = payload.error;
    if (code === 'cannot_delete_self') {
      throw new Error('No puedes eliminar tu propia cuenta desde aquí.');
    }
    if (code === 'cannot_delete_last_admin') {
      throw new Error('No se puede eliminar al único coordinador.');
    }
    throw new Error(readErrorMessage(payload, 'No se pudo eliminar el integrante.'));
  }
}
