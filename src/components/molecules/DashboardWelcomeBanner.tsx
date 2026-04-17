import React from 'react';
import { Link } from 'react-router-dom';
import { X, Calendar, Vote, Banknote } from 'lucide-react';

const STORAGE_KEY = 'dashboard_welcome_banner_dismissed_v1';

export const DashboardWelcomeBanner: React.FC = () => {
  const [dismissed, setDismissed] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  });

  const dismiss = () => {
    window.localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <aside
      className="rounded-xl border border-primary-200 bg-primary-50/90 px-4 py-5 shadow-sm sm:px-6"
      aria-labelledby="welcome-steps-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="welcome-steps-heading" className="text-lg font-semibold text-dark-900">
            Primeros pasos en el área privada
          </h2>
          <p className="mt-1 text-sm text-dark-600 max-w-2xl">
            Participa en votaciones, revisa el calendario y conoce cómo se usan las donaciones en la barra.
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-4">
            <li>
              <Link
                to="/calendar"
                className="inline-flex items-center gap-2 font-medium text-primary-600 hover:text-primary-700"
              >
                <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                Eventos y partidos
              </Link>
            </li>
            <li>
              <Link
                to="/voting"
                className="inline-flex items-center gap-2 font-medium text-primary-600 hover:text-primary-700"
              >
                <Vote className="h-4 w-4 shrink-0" aria-hidden />
                Votaciones abiertas
              </Link>
            </li>
            <li>
              <Link
                to="/contribute"
                className="inline-flex items-center gap-2 font-medium text-primary-600 hover:text-primary-700"
              >
                <Banknote className="h-4 w-4 shrink-0" aria-hidden />
                Finanzas y transparencia
              </Link>
            </li>
          </ul>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="self-end rounded-lg p-2 text-dark-500 hover:bg-primary-100 hover:text-dark-800 sm:self-start"
          aria-label="Cerrar mensaje de bienvenida"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
};
