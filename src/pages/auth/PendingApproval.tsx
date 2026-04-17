import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Alert, Spinner } from '../../components/atoms';
import { PublicLayout } from '../../components/templates';
import { useAuth } from '../../context/AuthContext';
import { uploadFanVerificationPhoto } from '../../services/fanVerificationStorage';
import {
  clearPendingVerificationDraft,
  readPendingVerificationDraft,
} from '../../services/pendingVerificationDraft';
import { supabase } from '../../services/supabaseClient';
import { UserStatus } from '../../types';
import { trackAppEventOnce } from '../../utils/analytics';

export const PendingApproval: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, signOut, refreshProfile, canAccessPrivateArea } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const autoUploadAttemptedRef = React.useRef(false);
  const [busy, setBusy] = React.useState(false);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [msg, setMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (!isLoading && user?.status === UserStatus.ACTIVE && canAccessPrivateArea) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, user, canAccessPrivateArea, navigate]);

  React.useEffect(() => {
    if (!user || user.status !== UserStatus.PENDING) return;
    trackAppEventOnce(`pending_account:${user.id}`, 'pending_account_view', { surface: 'cuenta_pendiente' });
  }, [user]);

  const handleRefresh = async () => {
    setMsg(null);
    setBusy(true);
    try {
      await refreshProfile();
      setMsg({ type: 'success', text: 'Estado actualizado. Si ya fuiste aprobado, serás redirigido.' });
    } catch {
      setMsg({ type: 'error', text: 'No se pudo actualizar. Intenta de nuevo.' });
    } finally {
      setBusy(false);
    }
  };

  const uploadVerificationPhoto = React.useCallback(
    async (file: File, source: 'manual' | 'draft') => {
      if (!user) {
        throw new Error('Inicia sesión para subir la foto de verificación.');
      }

      const storagePath = await uploadFanVerificationPhoto(user.id, file);
      const { error: updateError } = await supabase
        .from('users')
        .update({
          fan_verification_storage_path: storagePath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      try {
        await clearPendingVerificationDraft(user.email);
      } catch {
        // Evita que un fallo de almacenamiento local afecte la subida exitosa.
      }
      if (source === 'manual' && fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setMsg({
        type: 'success',
        text:
          source === 'draft'
            ? 'Recuperamos y enviamos automáticamente tu foto de verificación para revisión de coordinación.'
            : 'Foto de verificación enviada correctamente. Ya puede ser revisada por coordinación.',
      });
    },
    [refreshProfile, user]
  );

  React.useEffect(() => {
    if (!user || isLoading) return;
    if (user.status !== UserStatus.PENDING) return;
    if (user.fan_verification_storage_path) return;
    if (autoUploadAttemptedRef.current) return;

    autoUploadAttemptedRef.current = true;

    void (async () => {
      try {
        const draft = await readPendingVerificationDraft(user.email);
        if (!draft) return;
        setMsg(null);
        setUploadingPhoto(true);
        await uploadVerificationPhoto(draft, 'draft');
      } catch (error) {
        setMsg({
          type: 'error',
          text: error instanceof Error ? error.message : 'No se pudo enviar la foto guardada. Intenta de nuevo.',
        });
      } finally {
        setUploadingPhoto(false);
      }
    })();
  }, [isLoading, uploadVerificationPhoto, user]);

  const handleUploadVerificationPhoto = async () => {
    if (!user) return;
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setMsg({ type: 'error', text: 'Selecciona una foto antes de enviar.' });
      return;
    }

    setMsg(null);
    setUploadingPhoto(true);
    try {
      await uploadVerificationPhoto(file, 'manual');
    } catch (error) {
      setMsg({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo enviar la foto. Intenta de nuevo.',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      </PublicLayout>
    );
  }

  if (!user) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-md py-12">
          <div className="rounded-lg border border-dark-200 bg-white p-8 text-center">
            <p className="text-dark-600 mb-4">Inicia sesión para ver el estado de tu solicitud.</p>
            <Link to="/login" className="text-primary-400 font-medium">
              Ir a iniciar sesión
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (user.status === UserStatus.INACTIVE) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-md py-12">
          <div className="rounded-lg border border-dark-200 bg-white p-8 text-center space-y-4">
            <p className="text-dark-600">
              Tu solicitud no fue aprobada o tu cuenta está inactiva. Si crees que es un error, contacta a un
              coordinador.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                signOut().catch(() => {});
              }}
            >
              Cerrar sesión
            </Button>
            <p>
              <Link to="/" className="text-primary-400 font-medium">
                Volver al inicio
              </Link>
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (user.status !== UserStatus.PENDING) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-md py-12">
          <div className="rounded-lg border border-dark-200 bg-white p-8 text-center">
            <p className="text-dark-600 mb-4">Tu cuenta no está en revisión.</p>
            <Link to="/" className="text-primary-400 font-medium">
              Volver al inicio
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-lg py-12">
        <div className="rounded-lg border border-dark-200 bg-white p-8">
          <h1 className="text-2xl font-bold text-dark-900 mb-2">Solicitud en revisión</h1>
          <p className="text-dark-600 mb-4">
            Gracias por registrarte. Un coordinador revisará tu foto de hincha de Inter Bogotá y activará tu cuenta;
            los tiempos dependen del equipo, pero suele ser en pocos días. Cuando el estado pase a{' '}
            <strong>activo</strong>, podrás entrar al área privada (votaciones, calendario, finanzas).
          </p>
          <p className="text-sm text-dark-500 mb-6">
            Puedes usar &quot;Comprobar estado&quot; más tarde o cerrar sesión. Si ya subiste la foto, solo queda
            esperar la revisión.
          </p>

          {!user.fan_verification_storage_path && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm text-amber-900">
                Tu cuenta aún no tiene foto de verificación. Súbela para que coordinación pueda aprobar tu solicitud.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="block w-full text-sm text-dark-700 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-medium file:text-dark-900"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  handleUploadVerificationPhoto().catch(() => {});
                }}
                isLoading={uploadingPhoto}
                disabled={busy}
              >
                Subir foto de verificación
              </Button>
            </div>
          )}

          {msg && <Alert type={msg.type} message={msg.text} className="mb-4" />}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                handleRefresh().catch(() => {});
              }}
              disabled={busy || uploadingPhoto}
              isLoading={busy}
            >
              Comprobar estado
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={uploadingPhoto}
              onClick={() => {
                signOut().catch(() => {});
              }}
            >
              Cerrar sesión
            </Button>
          </div>

          <p className="text-center text-dark-600 text-sm mt-8">
            <Link to="/" className="text-primary-400 hover:text-primary-500 font-medium">
              Volver al inicio
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
};
