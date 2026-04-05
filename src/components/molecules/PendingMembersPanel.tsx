import React, { useEffect, useState } from 'react';
import { UserCheck, UserX, ImageOff } from 'lucide-react';
import { Button, Alert, Spinner } from '../atoms';
import { usePendingMembers, useApproveMember, useRejectMember } from '../../hooks';
import { getFanVerificationSignedUrl } from '../../services/fanVerificationStorage';
import type { User } from '../../types';

function FanVerificationPreview({ member, signedUrl }: Readonly<{ member: User; signedUrl?: string }>) {
  if (signedUrl) {
    return (
      <img
        src={signedUrl}
        alt={`Verificación de ${member.full_name}`}
        className="w-full h-full object-cover"
      />
    );
  }
  if (member.fan_verification_storage_path) {
    return <Spinner size="md" />;
  }
  return (
    <span className="flex flex-col items-center gap-1 text-dark-400 text-xs p-2 text-center">
      <ImageOff className="w-8 h-8" aria-hidden />
      Sin foto
    </span>
  );
}

export const PendingMembersPanel: React.FC = () => {
  const { data, isLoading, isError, error } = usePendingMembers();
  const approveMutation = useApproveMember();
  const rejectMutation = useRejectMember();
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.length) {
      setSignedUrls({});
      return;
    }

    let cancelled = false;

    void (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        data.map(async (member: User) => {
          if (!member.fan_verification_storage_path) return;
          const url = await getFanVerificationSignedUrl(member.fan_verification_storage_path);
          if (url) next[member.id] = url;
        })
      );
      if (!cancelled) setSignedUrls(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [data]);

  const handleApprove = async (userId: string) => {
    setActionError(null);
    try {
      await approveMutation.mutateAsync(userId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo aprobar.');
    }
  };

  const handleReject = async (userId: string) => {
    setActionError(null);
    const ok = globalThis.confirm(
      '¿Rechazar esta solicitud? El integrante quedará inactivo y no podrá usar el área privada.'
    );
    if (!ok) return;
    try {
      await rejectMutation.mutateAsync(userId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo rechazar.');
    }
  };

  return (
    <div id="integrantes-pendientes" className="rounded-lg border border-dark-200 bg-white p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-dark-900">Solicitudes de integrantes</h2>
        <p className="text-sm text-dark-600 mt-1">
          Revisa la foto de verificación y aprueba o rechaza el acceso al área privada.
        </p>
      </div>

      {actionError && <Alert type="error" message={actionError} />}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <Alert type="error" message={error instanceof Error ? error.message : 'No se pudo cargar la lista.'} />
      )}

      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <p className="text-sm text-dark-500 py-4">No hay solicitudes pendientes.</p>
      )}

      {!isLoading && data && data.length > 0 && (
        <ul className="space-y-6">
          {data.map((member) => (
            <li
              key={member.id}
              className="flex flex-col gap-4 border border-dark-100 rounded-lg p-4 md:flex-row md:items-stretch"
            >
              <div className="shrink-0 w-full md:w-48 aspect-[4/3] bg-dark-50 rounded-md overflow-hidden flex items-center justify-center border border-dark-100">
                <FanVerificationPreview member={member} signedUrl={signedUrls[member.id]} />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <p className="font-semibold text-dark-900">{member.full_name}</p>
                <p className="text-sm text-dark-600 break-all">{member.email}</p>
                {member.phone && <p className="text-sm text-dark-600">Tel: {member.phone}</p>}
                <p className="text-xs text-dark-500">
                  ID integrante: {member.member_id} · Solicitud:{' '}
                  {new Date(member.created_at).toLocaleString()}
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    className="inline-flex items-center gap-1"
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    onClick={() => void handleApprove(member.id)}
                  >
                    <UserCheck className="w-4 h-4" aria-hidden />
                    Aprobar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="inline-flex items-center gap-1 text-red-700 border-red-200 hover:bg-red-50"
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    onClick={() => void handleReject(member.id)}
                  >
                    <UserX className="w-4 h-4" aria-hidden />
                    Rechazar
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
