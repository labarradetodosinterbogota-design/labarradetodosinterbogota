import React, { useEffect, useState } from 'react';
import { UserCheck, UserX, ImageOff, Search } from 'lucide-react';
import { Button, Alert, Spinner, Input, Badge } from '../atoms';
import { usePendingMembers, useApproveMember, useRejectMember, useRecentInactiveMembers } from '../../hooks';
import { useUpdateMemberAdminProfile } from '../../hooks/useMemberAdmin';
import { memberAdminService } from '../../services/memberAdminService';
import { getFanVerificationSignedUrl } from '../../services/fanVerificationStorage';
import type { User } from '../../types';
import { UserStatus } from '../../types';

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

function statusBadgeVariant(status: UserStatus): 'warning' | 'info' | 'error' | 'success' {
  switch (status) {
    case UserStatus.PENDING:
      return 'warning';
    case UserStatus.ACTIVE:
      return 'success';
    case UserStatus.INACTIVE:
      return 'info';
    case UserStatus.BANNED:
      return 'error';
    default:
      return 'info';
  }
}

function statusLabelEs(status: UserStatus): string {
  switch (status) {
    case UserStatus.PENDING:
      return 'Pendiente';
    case UserStatus.ACTIVE:
      return 'Activo';
    case UserStatus.INACTIVE:
      return 'Inactivo';
    case UserStatus.BANNED:
      return 'Suspendido';
    default:
      return status;
  }
}

function MemberStatusActions({
  member,
  disabled,
  onReopen,
  onActivate,
}: Readonly<{
  member: User;
  disabled: boolean;
  onReopen: () => void;
  onActivate: () => void;
}>) {
  if (member.status === UserStatus.ACTIVE) {
    return <p className="text-sm text-dark-500">La cuenta ya está activa.</p>;
  }
  if (member.status === UserStatus.PENDING) {
    return <p className="text-sm text-dark-500">Aparece en la lista de solicitudes pendientes.</p>;
  }
  if (member.status === UserStatus.BANNED) {
    return (
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onActivate}>
          Reactivar cuenta (suspendido)
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={onReopen}>
        Volver a pendiente
      </Button>
      <Button type="button" variant="primary" size="sm" disabled={disabled} onClick={onActivate}>
        Activar ahora
      </Button>
    </div>
  );
}

export const PendingMembersPanel: React.FC = () => {
  const { data, isLoading, isError, error } = usePendingMembers();
  const inactiveQuery = useRecentInactiveMembers();
  const approveMutation = useApproveMember();
  const rejectMutation = useRejectMember();
  const statusMutation = useUpdateMemberAdminProfile();
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [emailSearch, setEmailSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedUser, setSearchedUser] = useState<User | null | undefined>(undefined);

  const statusBusy =
    approveMutation.isPending || rejectMutation.isPending || statusMutation.isPending;

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

  const handleEmailSearch = async () => {
    setSearchError(null);
    setSearchedUser(undefined);
    const q = emailSearch.trim();
    if (!q) {
      setSearchError('Escribe un correo para buscar.');
      return;
    }
    setSearchLoading(true);
    try {
      const found = await memberAdminService.findUserByEmail(q);
      setSearchedUser(found);
      if (!found) {
        setSearchError(
          'No hay perfil con ese correo. Si la persona sí tiene cuenta en el sistema, revisa mayúsculas o un error de escritura; si nunca completó el registro, debe registrarse de nuevo.'
        );
      }
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'No se pudo buscar.');
      setSearchedUser(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const runStatusPatch = async (userId: string, patch: { status: UserStatus }) => {
    setActionError(null);
    setSearchError(null);
    try {
      await statusMutation.mutateAsync({ userId, patch });
      if (searchedUser?.id === userId) {
        setSearchedUser({ ...searchedUser, ...patch, updated_at: new Date().toISOString() });
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo actualizar el estado.');
    }
  };

  const handleReopenPending = (userId: string) => {
    void runStatusPatch(userId, { status: UserStatus.PENDING });
  };

  const handleActivateAccount = (member: User) => {
    if (member.status === UserStatus.BANNED) {
      const ok = globalThis.confirm(
        'Esta cuenta estaba suspendida. ¿Activarla de todos modos? Comprueba que sea el caso correcto.'
      );
      if (!ok) return;
    }
    void runStatusPatch(member.id, { status: UserStatus.ACTIVE });
  };

  return (
    <div id="integrantes-pendientes" className="rounded-lg border border-dark-200 bg-white p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-dark-900">Solicitudes de integrantes</h2>
        <p className="text-sm text-dark-600 mt-1">
          Revisa la foto de verificación y aprueba o rechaza el acceso al área privada. Si alguien dice que su cuenta no
          está activa y no aparece abajo, puede estar en estado <strong>inactivo</strong> (por ejemplo tras un
          rechazo): usa la búsqueda por correo o la lista de inactivos recientes.
        </p>
      </div>

      <div className="rounded-lg border border-dark-100 bg-dark-50/50 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-dark-900">Buscar integrante por correo</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            label="Correo"
            type="email"
            autoComplete="off"
            value={emailSearch}
            onChange={(e) => setEmailSearch(e.target.value)}
            disabled={searchLoading || statusBusy}
            placeholder="ej. nombre@outlook.com"
          />
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              className="inline-flex items-center gap-1"
              disabled={searchLoading || statusBusy}
              onClick={() => void handleEmailSearch()}
            >
              {searchLoading ? <Spinner size="sm" /> : <Search className="w-4 h-4" aria-hidden />}
              Buscar
            </Button>
          </div>
        </div>
        {searchError && <Alert type="warning" message={searchError} />}
        {searchedUser !== undefined && searchedUser !== null && (
          <div className="rounded-md border border-dark-200 bg-white p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <p className="font-medium text-dark-900">{searchedUser.full_name}</p>
              <Badge variant={statusBadgeVariant(searchedUser.status)} size="sm">
                {statusLabelEs(searchedUser.status)}
              </Badge>
            </div>
            <p className="text-sm text-dark-600 break-all">{searchedUser.email}</p>
            <p className="text-xs text-dark-500">Carné: {searchedUser.member_id}</p>
            <MemberStatusActions
              member={searchedUser}
              disabled={statusBusy}
              onReopen={() => handleReopenPending(searchedUser.id)}
              onActivate={() => handleActivateAccount(searchedUser)}
            />
          </div>
        )}
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
        <p className="text-sm text-dark-500 py-2">No hay solicitudes pendientes en este momento.</p>
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
                    disabled={statusBusy}
                    onClick={() => void handleApprove(member.id)}
                  >
                    <UserCheck className="w-4 h-4" aria-hidden />
                    Aprobar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="inline-flex items-center gap-1 text-red-700 border-red-200 hover:bg-red-50"
                    disabled={statusBusy}
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

      <div className="border-t border-dark-100 pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-dark-900">Inactivos recientes (atención)</h3>
        <p className="text-xs text-dark-500">
          Últimos 25 integrantes marcados inactivos (p. ej. tras rechazo). Puedes volver a ponerlos en pendiente o
          activarlos.
        </p>
        {inactiveQuery.isLoading && (
          <div className="flex justify-center py-6">
            <Spinner size="md" />
          </div>
        )}
        {inactiveQuery.isError && (
          <Alert type="error" message="No se pudo cargar la lista de inactivos." />
        )}
        {!inactiveQuery.isLoading && inactiveQuery.data && inactiveQuery.data.length === 0 && (
          <p className="text-sm text-dark-500">No hay integrantes inactivos recientes.</p>
        )}
        {!inactiveQuery.isLoading && inactiveQuery.data && inactiveQuery.data.length > 0 && (
          <ul className="divide-y divide-dark-100 border border-dark-100 rounded-lg overflow-hidden">
            {inactiveQuery.data.map((m) => (
              <li key={m.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-white">
                <div className="min-w-0">
                  <p className="font-medium text-dark-900 truncate">{m.full_name}</p>
                  <p className="text-sm text-dark-600 break-all">{m.email}</p>
                  <p className="text-xs text-dark-500">
                    Actualizado: {new Date(m.updated_at).toLocaleString('es-CO')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={statusBusy}
                    onClick={() => handleReopenPending(m.id)}
                  >
                    Pendiente
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={statusBusy}
                    onClick={() => handleActivateAccount(m)}
                  >
                    Activar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
