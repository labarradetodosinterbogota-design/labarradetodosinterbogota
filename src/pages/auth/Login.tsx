import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button, Input, Alert } from '../../components/atoms';
import { PublicLayout } from '../../components/templates';
import { useAuth } from '../../context/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
}

export const Login: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto py-12">
        <div className="bg-white rounded-lg border border-dark-200 p-8">
          <h1 className="text-2xl font-bold text-dark-900 mb-2">Bienvenido de nuevo</h1>
          <p className="text-dark-600 mb-6">Ingresa a tu cuenta de Inter Bogotá</p>

          {error && <Alert type="error" message={error} className="mb-6" />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              {...register('password', { required: 'La contraseña es obligatoria' })}
              error={errors.password?.message}
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Entrar
            </Button>
          </form>

          <p className="text-center text-dark-600 text-sm mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-500 font-medium">
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
};
