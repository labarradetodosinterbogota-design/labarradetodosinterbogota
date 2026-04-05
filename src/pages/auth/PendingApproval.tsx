import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Alert, Spinner } from '../../components/atoms';
import { PublicLayout } from '../../components/templates';
import { useAuth } from '../../context/AuthContext';
import { UserStatus } from '../../types';

export const PendingApproval: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, signOut, refreshProfile, canAccessPrivateArea } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (!isLoading && user?.status === UserStatus.ACTIVE && canAccessPrivateArea) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, user, canAccessPrivateArea, navigate]);

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
        <div className="mx-auto max-w-md py-12 text-center">
          <p className="text-dark-600 mb-4">Inicia sesión para ver el estado de tu solicitud.</p>
          <Link to="/login" className="text-primary-400 font-medium">
            Ir a iniciar sesión
          </Link>
        </div>
      </PublicLayout>
    );
  }

  if (user.status === UserStatus.INACTIVE) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-md py-12 text-center space-y-4">
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
      </PublicLayout>
    );
  }

  if (user.status !== UserStatus.PENDING) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-md py-12 text-center">
          <p className="text-dark-600 mb-4">Tu cuenta no está en revisión.</p>
          <Link to="/" className="text-primary-400 font-medium">
            Volver al inicio
          </Link>
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
            Gracias por registrarte. Un coordinador verificará tu foto de hincha de Inter Bogotá y activará tu
            cuenta. Recibirás acceso al área privada cuando el estado pase a <strong>activo</strong>.
          </p>
          <p className="text-sm text-dark-500 mb-6">
            Mientras tanto puedes cerrar sesión o comprobar si ya fuiste aprobado.
          </p>

          {msg && <Alert type={msg.type} message={msg.text} className="mb-4" />}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                handleRefresh().catch(() => {});
              }}
              disabled={busy}
              isLoading={busy}
            >
              Comprobar estado
            </Button>
            <Button
              type="button"
              variant="outline"
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
