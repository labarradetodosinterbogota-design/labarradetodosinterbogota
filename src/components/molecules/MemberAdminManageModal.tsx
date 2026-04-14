import React, { useEffect, useId, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ImageOff } from 'lucide-react';
import { Modal } from './Modal';
import { Alert, Button, Input, Select, Spinner } from '../atoms';
import {
  getFanVerificationSignedUrl,
  removeFanVerificationObjects,
  uploadFanVerificationPhoto,
} from '../../services/fanVerificationStorage';
import { memberAdminService } from '../../services/memberAdminService';
import { useAdminDeleteMember, useAdminSetMemberPassword, useUpdateMemberAdminProfile } from '../../hooks/useMemberAdmin';
import type { User } from '../../types';
import { UserRole, UserStatus } from '../../types';

interface MemberAdminManageModalProps {
  member: User | null;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

function roleLabel(role: UserRole): string {
  return role === UserRole.COORDINATOR_ADMIN ? 'Coordinador' : 'Integrante';
}

function statusLabel(status: UserStatus): string {
  switch (status) {
    case UserStatus.ACTIVE:
      return 'Activo';
    case UserStatus.PENDING:
      return 'Pendiente';
    case UserStatus.INACTIVE:
      return 'Inactivo';
    case UserStatus.BANNED:
      return 'Suspendido';
    default:
      return status;
  }
}

function MemberAdminVerificationThumb({
  uploadingPhoto,
  verificationUrl,
  hasStoragePath,
  fullName,
}: Readonly<{
  uploadingPhoto: boolean;
  verificationUrl: string | null;
  hasStoragePath: boolean;
  fullName: string;
}>) {
  if (uploadingPhoto) {
    return <Spinner size="md" />;
  }
  if (verificationUrl) {
    return (
      <img
        src={verificationUrl}
        alt={`Foto de verificación de ${fullName}`}
        className="w-full h-full object-cover"
      />
    );
  }
  if (hasStoragePath) {
    return <Spinner size="md" />;
  }
  return (
    <span className="flex flex-col items-center gap-1 text-dark-400 text-xs p-2 text-center">
      <ImageOff className="w-8 h-8" aria-hidden />
      Sin foto registrada
    </span>
  );
}

export const MemberAdminManageModal: React.FC<MemberAdminManageModalProps> = ({
  member,
  currentUserId,
  isOpen,
  onClose,
  onDeleted,
}) => {
  const verificationInputId = useId();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.BASIC_USER);
  const [status, setStatus] = useState<UserStatus>(UserStatus.ACTIVE);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const updateProfile = useUpdateMemberAdminProfile();
  const setPasswordMutation = useAdminSetMemberPassword();
  const deleteMutation = useAdminDeleteMember();

  useEffect(() => {
    if (!member || !isOpen) return;
    setFullName(member.full_name);
    setPhone(member.phone ?? '');
    setRole(member.role);
    setStatus(member.status);
    setProfileError(null);
    setPasswordError(null);
    setDeleteError(null);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordNotice(null);
    setPasswordMutation.reset();
  }, [isOpen, member?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- solo al abrir o cambiar id; evita reset al invalidar queries

  useEffect(() => {
    if (!isOpen || !member?.fan_verification_storage_path) {
      setVerificationUrl(null);
      return;
    }
    let cancelled = false;
    void getFanVerificationSignedUrl(member.fan_verification_storage_path).then((url) => {
      if (!cancelled) setVerificationUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, member?.fan_verification_storage_path]);

  if (!member) return null;

  const handleSaveProfile = async () => {
    setProfileError(null);
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setProfileError('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    try {
      if (
        member.role === UserRole.COORDINATOR_ADMIN &&
        role === UserRole.BASIC_USER &&
        (await memberAdminService.countCoordinatorAdmins()) <= 1
      ) {
        setProfileError('Debe existir al menos un coordinador.');
        return;
      }
      await updateProfile.mutateAsync({
        userId: member.id,
        patch: {
          full_name: trimmedName,
          phone: phone.trim() === '' ? null : phone.trim(),
          role,
          status,
        },
      });
      onClose();
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }
    try {
      await setPasswordMutation.mutateAsync({ targetUserId: member.id, newPassword });
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError(null);
      setPasswordNotice('Contraseña actualizada correctamente.');
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña.');
    }
  };

  const handleDelete = async () => {
    setDeleteError(null);
    const ok = globalThis.confirm(
      `¿Eliminar definitivamente a ${member.full_name}? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(member.id);
      onDeleted();
      onClose();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'No se pudo eliminar.');
    }
  };

  const handleVerificationFile = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setProfileError(null);
    setUploadingPhoto(true);
    const previousPath = member.fan_verification_storage_path;
    try {
      const newPath = await uploadFanVerificationPhoto(member.id, file);
      await memberAdminService.updateFanVerificationPath(member.id, newPath);
      if (previousPath && previousPath !== newPath) {
        try {
          await removeFanVerificationObjects([previousPath]);
        } catch {
          /* best effort: archivo anterior puede quedar huérfano */
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['members'] });
      void queryClient.invalidateQueries({ queryKey: ['members-search'] });
      void queryClient.invalidateQueries({ queryKey: ['pending-members'] });
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'No se pudo subir la foto.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const isSelf = member.id === currentUserId;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestionar integrante" size="lg">
      <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-1">
        {profileError && <Alert type="error" message={profileError} />}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-dark-800">Datos del perfil</h3>
          <p className="text-xs text-dark-500 break-all">Correo (solo lectura): {member.email}</p>
          <p className="text-xs text-dark-500">Carné: {member.member_id}</p>
          <Input label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Select
            label="Rol"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={[
              { value: UserRole.BASIC_USER, label: roleLabel(UserRole.BASIC_USER) },
              { value: UserRole.COORDINATOR_ADMIN, label: roleLabel(UserRole.COORDINATOR_ADMIN) },
            ]}
          />
          <Select
            label="Estado"
            value={status}
            onChange={(e) => setStatus(e.target.value as UserStatus)}
            options={[
              { value: UserStatus.ACTIVE, label: statusLabel(UserStatus.ACTIVE) },
              { value: UserStatus.PENDING, label: statusLabel(UserStatus.PENDING) },
              { value: UserStatus.INACTIVE, label: statusLabel(UserStatus.INACTIVE) },
              { value: UserStatus.BANNED, label: statusLabel(UserStatus.BANNED) },
            ]}
          />
          <Button
            type="button"
            variant="primary"
            isLoading={updateProfile.isPending}
            onClick={() => void handleSaveProfile()}
          >
            Guardar cambios
          </Button>
        </section>

        <section className="space-y-3 border-t border-dark-100 pt-6">
          <h3 className="text-sm font-semibold text-dark-800">Foto de verificación (hincha)</h3>
          <div className="aspect-[4/3] max-w-xs bg-dark-50 rounded-md border border-dark-100 overflow-hidden flex items-center justify-center">
            <MemberAdminVerificationThumb
              uploadingPhoto={uploadingPhoto}
              verificationUrl={verificationUrl}
              hasStoragePath={Boolean(member.fan_verification_storage_path)}
              fullName={member.full_name}
            />
          </div>
          <div>
            <label htmlFor={verificationInputId} className="block text-sm font-medium text-dark-700 mb-1">
              Subir o reemplazar foto
            </label>
            <input
              id={verificationInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={uploadingPhoto}
              className="block w-full text-sm text-dark-600"
              onChange={(e) => void handleVerificationFile(e.target.files)}
            />
            <p className="text-xs text-dark-500 mt-1">JPEG, PNG, WebP o GIF, máximo 5 MB.</p>
          </div>
        </section>

        <section className="space-y-3 border-t border-dark-100 pt-6">
          <h3 className="text-sm font-semibold text-dark-800">Contraseña de acceso</h3>
          {passwordError && <Alert type="error" message={passwordError} />}
          {passwordNotice && <Alert type="success" message={passwordNotice} />}
          <Input
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => {
              setPasswordNotice(null);
              setNewPassword(e.target.value);
            }}
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setPasswordNotice(null);
              setConfirmPassword(e.target.value);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            isLoading={setPasswordMutation.isPending}
            onClick={() => void handleChangePassword()}
          >
            Establecer contraseña
          </Button>
        </section>

        <section className="space-y-3 border-t border-dark-100 pt-6">
          <h3 className="text-sm font-semibold text-red-800">Zona de riesgo</h3>
          {deleteError && <Alert type="error" message={deleteError} />}
          <p className="text-sm text-dark-600">
            Elimina la cuenta en el sistema y el acceso por correo. No uses esta opción salvo que sea necesario.
          </p>
          <Button
            type="button"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
            disabled={isSelf || deleteMutation.isPending}
            isLoading={deleteMutation.isPending}
            onClick={() => void handleDelete()}
          >
            {isSelf ? 'No puedes eliminarte a ti mismo' : 'Eliminar integrante'}
          </Button>
        </section>
      </div>
    </Modal>
  );
};
