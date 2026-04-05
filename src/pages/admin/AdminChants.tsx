import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Input, Select, Spinner, TextArea } from '../../components/atoms';
import { useAllChants, useCreateChant } from '../../hooks';
import { useAuth } from '../../context/AuthContext';
import { chantStatusLabels } from '../../locales/es';
import { chantService } from '../../services/chantService';
import type { Chant } from '../../types';

function getStatusVariant(status: Chant['status']): 'success' | 'warning' | 'error' {
  if (status === 'approved') return 'success';
  if (status === 'pending') return 'warning';
  return 'error';
}

const STATUS_OPTIONS: Array<{ value: Chant['status']; label: string }> = [
  { value: 'approved', label: 'Aprobado' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'rejected', label: 'Rechazado' },
];

function toNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

export const AdminChants: React.FC = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [editingChantId, setEditingChantId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [status, setStatus] = useState<Chant['status']>('approved');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAllChants(page, 15);
  const createMutation = useCreateChant();

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Chant> }) =>
      chantService.update(id, updates),
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

  const resetForm = () => {
    setEditingChantId(null);
    setTitle('');
    setCategory('');
    setLyrics('');
    setAudioUrl('');
    setVideoUrl('');
    setStatus('approved');
  };

  const handleEdit = (chant: Chant) => {
    setEditingChantId(chant.id);
    setTitle(chant.title);
    setCategory(chant.category);
    setLyrics(chant.lyrics);
    setAudioUrl(chant.audio_url ?? '');
    setVideoUrl(chant.video_url ?? '');
    setStatus(chant.status);
    setMessage(null);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!user) {
      setMessage({ type: 'error', text: 'No hay sesión activa para gestionar cánticos.' });
      return;
    }

    const safeTitle = title.trim();
    const safeCategory = category.trim();
    const safeLyrics = lyrics.trim();

    if (!safeTitle || !safeCategory || !safeLyrics) {
      setMessage({ type: 'error', text: 'Título, categoría y letra son obligatorios.' });
      return;
    }

    const payload: Omit<Chant, 'id' | 'created_at' | 'updated_at' | 'created_by'> = {
      title: safeTitle,
      category: safeCategory,
      lyrics: safeLyrics,
      audio_url: toNullableString(audioUrl),
      video_url: toNullableString(videoUrl),
      status,
    };

    try {
      if (editingChantId) {
        await updateMutation.mutateAsync({ id: editingChantId, updates: payload });
        setMessage({ type: 'success', text: 'Cántico actualizado correctamente.' });
      } else {
        await createMutation.mutateAsync({ chant: payload, userId: user.id });
        setMessage({ type: 'success', text: 'Cántico creado correctamente.' });
      }
      resetForm();
    } catch {
      setMessage({ type: 'error', text: 'No se pudo guardar el cántico.' });
    }
  };

  const handleStatusChange = async (id: string, nextStatus: Chant['status']) => {
    setMessage(null);
    try {
      await updateMutation.mutateAsync({
        id,
        updates: { status: nextStatus },
      });
      setMessage({
        type: 'success',
        text: `Cántico ${nextStatus === 'approved' ? 'aprobado' : 'rechazado'} correctamente.`,
      });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo actualizar el estado del cántico.' });
    }
  };

  const handleDelete = async (id: string) => {
    const accepted = globalThis.confirm('Esta acción eliminará el cántico. ¿Deseas continuar?');
    if (!accepted) return;

    setMessage(null);
    try {
      await deleteMutation.mutateAsync(id);
      if (editingChantId === id) {
        resetForm();
      }
      setMessage({ type: 'success', text: 'Cántico eliminado correctamente.' });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo eliminar el cántico.' });
    }
  };

  const chants = data?.data ?? [];
  const pendingCount = chants.filter((chant) => chant.status === 'pending').length;
  const approvedCount = chants.filter((chant) => chant.status === 'approved').length;
  const isSaving = createMutation.isPending || updateMutation.isPending;
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
                      variant="secondary"
                      disabled={isSaving}
                      onClick={() => handleEdit(chant)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={chant.status === 'approved'}
                      isLoading={updateMutation.isPending}
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
                      isLoading={updateMutation.isPending}
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
                      disabled={isSaving}
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

      <form onSubmit={handleSave} className="bg-white rounded-lg border border-dark-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-dark-900">
          {editingChantId ? 'Editar cántico' : 'Subir cántico'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Título"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ej: Dale Inter Bogotá"
            required
          />
          <Input
            label="Categoría"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Ej: Tribuna norte"
            required
          />
        </div>
        <TextArea
          label="Letra"
          value={lyrics}
          onChange={(event) => setLyrics(event.target.value)}
          rows={4}
          required
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="URL de audio (opcional)"
            value={audioUrl}
            onChange={(event) => setAudioUrl(event.target.value)}
            placeholder="https://..."
          />
          <Input
            label="URL de video (opcional)"
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
            placeholder="https://..."
          />
          <Select
            label="Estado"
            value={status}
            onChange={(event) => setStatus(event.target.value as Chant['status'])}
            options={STATUS_OPTIONS}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" isLoading={isSaving} disabled={deleteMutation.isPending}>
            {editingChantId ? 'Guardar cambios' : 'Crear cántico'}
          </Button>
          {editingChantId && (
            <Button type="button" variant="secondary" onClick={resetForm} disabled={isSaving}>
              Cancelar edición
            </Button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-lg border border-dark-200 p-4 flex flex-wrap items-center gap-3">
        <Badge variant="warning">Pendientes en esta página: {pendingCount}</Badge>
        <Badge variant="success">Aprobados en esta página: {approvedCount}</Badge>
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
