import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Input, Spinner, TextArea } from '../../components/atoms';
import { useAllVoting, useCreatePoll } from '../../hooks';
import { useAuth } from '../../context/AuthContext';
import { votingService } from '../../services/votingService';
import { VotingStatus } from '../../types';

function getStatusVariant(status: VotingStatus): 'secondary' | 'success' | 'info' {
  if (status === VotingStatus.ACTIVE) return 'success';
  if (status === VotingStatus.CLOSED) return 'secondary';
  return 'info';
}

const DEFAULT_END_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

export const AdminVoting: React.FC = () => {
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [endAt, setEndAt] = useState(DEFAULT_END_DATE);
  const [quorumRequired, setQuorumRequired] = useState('50');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAllVoting(page, 12);
  const createPollMutation = useCreatePoll();
  const closePollMutation = useMutation({
    mutationFn: (pollId: string) => votingService.closePoll(pollId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['all-polls'] });
      void queryClient.invalidateQueries({ queryKey: ['active-polls'] });
    },
  });

  const activeCount = useMemo(
    () => (data?.data ?? []).filter((poll) => poll.status === VotingStatus.ACTIVE).length,
    [data?.data]
  );
  const hasPolls = (data?.data?.length ?? 0) > 0;
  let pollsContent: React.ReactNode;

  if (isLoading) {
    pollsContent = (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  } else if (hasPolls) {
    pollsContent = (
      <div className="bg-white rounded-lg border border-dark-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-dark-50 text-left text-dark-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Título</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Votos</th>
              <th className="px-4 py-3 font-semibold">Cierra</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.data?.map((poll) => (
              <tr key={poll.id} className="border-t border-dark-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-dark-900">{poll.title}</p>
                  {poll.description && <p className="text-dark-500">{poll.description}</p>}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getStatusVariant(poll.status)}>{poll.status}</Badge>
                </td>
                <td className="px-4 py-3 text-dark-700">{poll.total_votes}</td>
                <td className="px-4 py-3 text-dark-700">{new Date(poll.end_date).toLocaleString('es-CO')}</td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={poll.status !== VotingStatus.ACTIVE}
                    isLoading={closePollMutation.isPending}
                    onClick={() => {
                      void handleClosePoll(poll.id);
                    }}
                  >
                    Cerrar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    pollsContent = (
      <div className="bg-white rounded-lg border border-dark-200 p-8 text-center text-dark-600">
        No hay votaciones registradas.
      </div>
    );
  }

  const handleCreatePoll = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!user) {
      setMessage({ type: 'error', text: 'No hay sesión activa para crear la votación.' });
      return;
    }

    const sanitizedTitle = title.trim();
    if (!sanitizedTitle) {
      setMessage({ type: 'error', text: 'El título es obligatorio.' });
      return;
    }

    const parsedEndDate = new Date(endAt);
    if (Number.isNaN(parsedEndDate.getTime())) {
      setMessage({ type: 'error', text: 'La fecha de cierre no es válida.' });
      return;
    }
    if (parsedEndDate <= new Date()) {
      setMessage({ type: 'error', text: 'La fecha de cierre debe ser futura.' });
      return;
    }

    const parsedQuorum = Number.parseInt(quorumRequired, 10);
    if (!Number.isInteger(parsedQuorum) || parsedQuorum < 1 || parsedQuorum > 100) {
      setMessage({ type: 'error', text: 'El quórum debe estar entre 1 y 100.' });
      return;
    }

    try {
      await createPollMutation.mutateAsync({
        userId: user.id,
        poll: {
          title: sanitizedTitle,
          description: description.trim() || null,
          type: 'yes_no',
          options: [
            { id: 'yes', label: 'Sí', vote_count: 0, percentage: 0 },
            { id: 'no', label: 'No', vote_count: 0, percentage: 0 },
          ],
          start_date: new Date().toISOString(),
          end_date: parsedEndDate.toISOString(),
          quorum_required: parsedQuorum,
          status: VotingStatus.ACTIVE,
          created_by: user.id,
        },
      });
      setTitle('');
      setDescription('');
      setEndAt(DEFAULT_END_DATE);
      setQuorumRequired('50');
      setMessage({ type: 'success', text: 'Votación creada correctamente.' });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo crear la votación.' });
    }
  };

  const handleClosePoll = async (pollId: string) => {
    setMessage(null);
    try {
      await closePollMutation.mutateAsync(pollId);
      setMessage({ type: 'success', text: 'Votación cerrada correctamente.' });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo cerrar la votación.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-dark-200 p-6">
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Gestión de votaciones</h1>
        <p className="text-dark-600">
          Crea nuevas votaciones y controla su estado para mantener decisiones transparentes.
        </p>
      </div>

      {message && <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />}

      <div className="bg-white rounded-lg border border-dark-200 p-4 flex flex-wrap items-center gap-3">
        <Badge variant="success">Activas en esta página: {activeCount}</Badge>
        <span className="text-sm text-dark-500">Total listadas: {data?.data?.length ?? 0}</span>
      </div>

      <form onSubmit={handleCreatePoll} className="bg-white rounded-lg border border-dark-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-dark-900">Crear votación rápida (Sí / No)</h2>
        <Input
          label="Título"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          placeholder="Ej: Aprobación de nuevo diseño de bandera"
        />
        <TextArea
          label="Descripción"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Contexto para que los integrantes voten informados"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Fecha de cierre"
            type="datetime-local"
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
            required
          />
          <Input
            label="Quórum requerido (%)"
            type="number"
            min={1}
            max={100}
            value={quorumRequired}
            onChange={(event) => setQuorumRequired(event.target.value)}
            required
          />
        </div>
        <Button type="submit" variant="primary" isLoading={createPollMutation.isPending}>
          Crear votación
        </Button>
      </form>

      {error && <Alert type="error" message="No se pudieron cargar las votaciones." />}
      {pollsContent}

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
