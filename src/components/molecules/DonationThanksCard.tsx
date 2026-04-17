import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Heart, Home, LayoutDashboard, UserPlus } from 'lucide-react';

export type DonationThanksVariant = 'public_donations' | 'private_finances';

interface DonationThanksCardProps {
  variant: DonationThanksVariant;
}

export const DonationThanksCard: React.FC<DonationThanksCardProps> = ({ variant }) => {
  const isPublic = variant === 'public_donations';

  return (
    <section
      className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-6 py-8 shadow-sm"
      aria-labelledby="donation-thanks-heading"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="donation-thanks-heading" className="text-2xl font-bold text-dark-900">
          Gracias por tu apoyo
        </h2>
        <p className="mt-3 text-dark-700">
          Si Mercado Pago aprobó el pago, el aporte quedará registrado para transparencia del grupo en breve. Si no lo
          ves al instante, espera unos minutos: a veces la acreditación demora.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-xl">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-dark-500">
          Sigue conectado con la barra
        </p>
        <ul className="space-y-2">
          {isPublic ? (
            <>
              <li>
                <Link
                  to="/calendar"
                  className="flex items-center gap-3 rounded-xl border border-dark-100 bg-white px-4 py-3 text-left text-sm font-medium text-dark-800 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50/50"
                >
                  <Calendar className="h-5 w-5 shrink-0 text-primary-500" aria-hidden />
                  Ver eventos y partidos
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="flex items-center gap-3 rounded-xl border border-dark-100 bg-white px-4 py-3 text-left text-sm font-medium text-dark-800 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50/50"
                >
                  <UserPlus className="h-5 w-5 shrink-0 text-primary-500" aria-hidden />
                  Únete como integrante
                </Link>
              </li>
              <li>
                <Link
                  to="/"
                  className="flex items-center gap-3 rounded-xl border border-dark-100 bg-white px-4 py-3 text-left text-sm font-medium text-dark-800 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50/50"
                >
                  <Home className="h-5 w-5 shrink-0 text-primary-500" aria-hidden />
                  Volver al inicio
                </Link>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link
                  to="/calendar"
                  className="flex items-center gap-3 rounded-xl border border-dark-100 bg-white px-4 py-3 text-left text-sm font-medium text-dark-800 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50/50"
                >
                  <Calendar className="h-5 w-5 shrink-0 text-primary-500" aria-hidden />
                  Revisar próximos eventos
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 rounded-xl border border-dark-100 bg-white px-4 py-3 text-left text-sm font-medium text-dark-800 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50/50"
                >
                  <LayoutDashboard className="h-5 w-5 shrink-0 text-primary-500" aria-hidden />
                  Ir al inicio del área privada
                </Link>
              </li>
              <li>
                <Link
                  to="/donaciones"
                  className="flex items-center gap-3 rounded-xl border border-dark-100 bg-white px-4 py-3 text-left text-sm font-medium text-dark-800 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50/50"
                >
                  <Heart className="h-5 w-5 shrink-0 text-primary-500" aria-hidden />
                  Compartir la página pública de donaciones
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </section>
  );
};
