interface BootstrapPendingMemberInput {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
}

interface BootstrapPendingMemberResponse {
  ok?: boolean;
  error?: string;
  message?: string;
}

export async function bootstrapPendingMemberRegistration(
  input: Readonly<BootstrapPendingMemberInput>
): Promise<void> {
  const res = await fetch('/api/auth/bootstrap-pending-member', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: input.userId,
      email: input.email.trim(),
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as BootstrapPendingMemberResponse;
  if (!res.ok) {
    throw new Error(
      payload.message ||
        'Cuenta creada, pero no se pudo registrar tu solicitud para aprobación. Intenta iniciar sesión nuevamente en unos segundos.'
    );
  }
}
