import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button, Input, Alert } from '../../components/atoms';
import { PublicLayout } from '../../components/templates';
import { useAuth } from '../../context/AuthContext';
import { BAR_OFFICIAL_NAME } from '../../constants/brand';

interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const Register: React.FC = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    setIsLoading(true);
    try {
      await signUp(data.email, data.password, data.fullName);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el registro.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto py-12">
        <div className="bg-white rounded-lg border border-dark-200 p-8">
          <h1 className="text-2xl font-bold text-dark-900 mb-2">Únete a {BAR_OFFICIAL_NAME}</h1>
          <p className="text-dark-600 mb-6">Crea tu cuenta de integrante</p>

          {error && <Alert type="error" message={error} className="mb-6" />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nombre completo"
              type="text"
              placeholder="Tu nombre completo"
              {...register('fullName', { required: 'El nombre es obligatorio' })}
              error={errors.fullName?.message}
            />

            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              {...register('email', { required: 'El correo es obligatorio' })}
              error={errors.email?.message}
            />

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
              Crear cuenta
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
