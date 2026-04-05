import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Spinner } from '../../components/atoms';
import { useAllChants } from '../../hooks';
import { chantStatusLabels } from '../../locales/es';
import { chantService } from '../../services/chantService';
import type { Chant } from '../../types';

function getStatusVariant(status: Chant['status']): 'success' | 'warning' | 'error' {
  if (status === 'approved') return 'success';
  if (status === 'pending') return 'warning';
  return 'error';
}

export const AdminChants: React.FC = () => {
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAllChants(page, 15);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Chant['status'] }) =>
      chantService.update(id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['all-chants'] });
      void queryClient.invalidateQueries({ queryKey: ['chants'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => chantService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['all-chants'] });
      void queryClient.invalidateQueries({ queryKey: ['chants'] });
    },
  });

  const handleStatusChange = async (id: string, status: Chant['status']) => {
    setMessage(null);
    try {
      await updateStatusMutation.mutateAsync({ id, status });
      setMessage({
        type: 'success',
        text: `Canto ${status === 'approved' ? 'aprobado' : 'rechazado'} correctamente.`,
      });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo actualizar el estado del canto.' });
    }
  };

  const handleDelete = async (id: string) => {
    const accepted = globalThis.confirm('Esta acción eliminará el canto. ¿Deseas continuar?');
    if (!accepted) return;

    setMessage(null);
    try {
      await deleteMutation.mutateAsync(id);
      setMessage({ type: 'success', text: 'Canto eliminado correctamente.' });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo eliminar el canto.' });
    }
  };

  const chants = data?.data ?? [];
  const pendingCount = chants.filter((chant) => chant.status === 'pending').length;
  let chantsContent: React.ReactNode;

  if (isLoading) {
    chantsContent = (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  } else if (chants.length > 0) {
    chantsContent = (
      <div className="bg-white rounded-lg border border-dark-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-dark-50 text-left text-dark-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Título</th>
              <th className="px-4 py-3 font-semibold">Categoría</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Creación</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {chants.map((chant) => (
              <tr key={chant.id} className="border-t border-dark-100 align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-dark-900">{chant.title}</p>
                  <p className="text-dark-500 line-clamp-2">{chant.lyrics}</p>
                </td>
                <td className="px-4 py-3 text-dark-700">{chant.category}</td>
                <td className="px-4 py-3">
                  <Badge variant={getStatusVariant(chant.status)}>
                    {chantStatusLabels[chant.status] ?? chant.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-dark-700">
                  {new Date(chant.created_at).toLocaleDateString('es-CO')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={chant.status === 'approved'}
                      isLoading={updateStatusMutation.isPending}
                      onClick={() => {
                        void handleStatusChange(chant.id, 'approved');
                      }}
                    >
                      Aprobar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={chant.status === 'rejected'}
                      isLoading={updateStatusMutation.isPending}
                      onClick={() => {
                        void handleStatusChange(chant.id, 'rejected');
                      }}
                    >
                      Rechazar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      isLoading={deleteMutation.isPending}
                      onClick={() => {
                        void handleDelete(chant.id);
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    chantsContent = (
      <div className="bg-white rounded-lg border border-dark-200 p-8 text-center text-dark-600">
        No hay cantos registrados.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-dark-200 p-6">
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Gestión de cantos</h1>
        <p className="text-dark-600">
          Revisa sugerencias, aprueba publicaciones y mantiene la biblioteca oficial actualizada.
        </p>
      </div>

      {message && <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />}

      <div className="bg-white rounded-lg border border-dark-200 p-4 flex flex-wrap items-center gap-3">
        <Badge variant="warning">Pendientes en esta página: {pendingCount}</Badge>
        <span className="text-sm text-dark-500">Total listados: {chants.length}</span>
      </div>

      {error && <Alert type="error" message="No se pudieron cargar los cantos. Intenta de nuevo." />}
      {chantsContent}

      {(data?.total_pages ?? 0) > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Anterior
          </Button>
          <span className="px-4 py-2 text-sm text-dark-700">
            Página {page} de {data?.total_pages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page === (data?.total_pages ?? page)}
            onClick={() => setPage((prev) => Math.min(data?.total_pages ?? prev, prev + 1))}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
};
