import React, { useState } from 'react';
import { EventCard } from '../../components/molecules';
import { Spinner, Alert } from '../../components/atoms';
import { useUpcomingEvents } from '../../hooks';

export const Calendar: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useUpcomingEvents(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Calendario</h1>
        <p className="text-dark-600">
          Próximos partidos, ensayos y eventos de la barra
        </p>
      </div>

      {error && (
        <Alert type="error" message="No se pudo cargar el calendario. Intenta de nuevo." />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.data.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {data.total_pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-dark-200 rounded-lg disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-4 py-2">
                Página {page} de {data.total_pages}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(data.total_pages, page + 1))}
                disabled={page === data.total_pages}
                className="px-4 py-2 border border-dark-200 rounded-lg disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-dark-600 text-lg">No hay eventos próximos por ahora</p>
        </div>
      )}
    </div>
  );
};
