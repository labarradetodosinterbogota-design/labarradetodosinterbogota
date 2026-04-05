import React, { useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button, Input, Alert } from '../../components/atoms';
import { PublicLayout } from '../../components/templates';
import { useAuth } from '../../context/AuthContext';
import { BAR_OFFICIAL_NAME } from '../../constants/brand';

interface RegisterFormData {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  hinchaConfirm: boolean;
}

export const Register: React.FC = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: { hinchaConfirm: false },
  });
  const [feedback, setFeedback] = React.useState<{ type: 'error' | 'info'; message: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const { signUp, user, canAccessPrivateArea, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const password = watch('password');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);

  React.useEffect(() => {
    if (authLoading) return;
    if (user && canAccessPrivateArea) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, user, canAccessPrivateArea, navigate]);

  const onSubmit = async (data: RegisterFormData) => {
    if (submitLockRef.current) return;
    setFeedback(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setFeedback({
        type: 'error',
        message: 'Debes adjuntar una foto que demuestre que eres hincha de Inter Bogotá.',
      });
      return;
    }

    submitLockRef.current = true;
    setIsLoading(true);
    try {
      await signUp({
        email: data.email.trim(),
        password: data.password,
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        verificationPhoto: file,
      });
      navigate('/cuenta-pendiente', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo completar el registro.';
      if (message.startsWith('Cuenta creada.')) {
        setFeedback({ type: 'info', message });
        return;
      }
      if (message.startsWith('Se alcanzó temporalmente el límite de correos de verificación.')) {
        setFeedback({ type: 'info', message });
        return;
      }
      setFeedback({ type: 'error', message });
    } finally {
      submitLockRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md py-12">
        <div className="rounded-lg border border-dark-200 bg-white p-8">
          <h1 className="text-2xl font-bold text-dark-900 mb-2">Únete a {BAR_OFFICIAL_NAME}</h1>
          <p className="text-dark-600 mb-6">Crea tu cuenta de integrante</p>

          <p className="text-sm text-dark-500 mb-4 rounded-lg bg-primary-50 border border-primary-100 px-3 py-2">
            Un coordinador revisará tu solicitud. Necesitamos una foto tuya con camiseta de Inter Bogotá, en el
            estadio, carnet u otro elemento que acredite tu hinchada.
          </p>

          {feedback && <Alert type={feedback.type} message={feedback.message} className="mb-6" />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nombre completo"
              type="text"
              placeholder="Tu nombre completo"
              {...register('fullName', { required: 'El nombre es obligatorio' })}
              error={errors.fullName?.message}
            />

            <Input
              label="Teléfono"
              type="tel"
              placeholder="Ej. +57 300 1234567"
              {...register('phone', {
                required: 'El teléfono es obligatorio',
                validate: (v) => {
                  const digits = v.replace(/\D/g, '');
                  return digits.length >= 10 || 'Introduce un teléfono válido (mínimo 10 dígitos).';
                },
              })}
              error={errors.phone?.message}
            />

            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              {...register('email', { required: 'El correo es obligatorio' })}
              error={errors.email?.message}
            />

            <div>
              <label htmlFor="fan-photo" className="mb-1 block text-sm font-medium text-dark-900">
                Foto de verificación (hincha de Inter Bogotá)
              </label>
              <input
                id="fan-photo"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="block w-full text-sm text-dark-600 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:font-medium file:text-primary-700"
              />
              <p className="mt-1 text-xs text-dark-500">JPEG, PNG, WebP o GIF. Máximo 5 MB.</p>
            </div>

            <div className="flex items-start gap-2">
              <input
                id="hincha-confirm"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-dark-300 text-primary-400 focus:ring-primary-400"
                {...register('hinchaConfirm', {
                  validate: (v) => v === true || 'Debes confirmar que la foto acredita tu hinchada.',
                })}
              />
              <label htmlFor="hincha-confirm" className="text-sm text-dark-700">
                Confirmo que la imagen que subo es real y demuestra mi condición de hincha de Inter Bogotá (por
                ejemplo camiseta del club, entrada, ubicación en el estadio, etc.).
              </label>
            </div>
            {errors.hinchaConfirm && (
              <p className="text-sm text-red-600">{errors.hinchaConfirm.message}</p>
            )}

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              {...register('password', {
                required: 'La contraseña es obligatoria',
                minLength: { value: 6, message: 'Mínimo 6 caracteres' },
              })}
              error={errors.password?.message}
            />

            <Input
              label="Confirmar contraseña"
              type="password"
              placeholder="••••••••"
              {...register('confirmPassword', {
                required: 'Confirma tu contraseña',
                validate: (value) => value === password || 'Las contraseñas no coinciden',
              })}
              error={errors.confirmPassword?.message}
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Enviar solicitud
            </Button>
          </form>

          <p className="text-center text-dark-600 text-sm mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-500 font-medium">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
};
