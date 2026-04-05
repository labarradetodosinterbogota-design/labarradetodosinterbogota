import React, { useState } from 'react';
import { VotingCard } from '../../components/molecules';
import { Spinner, Alert } from '../../components/atoms';
import { useActiveVoting, useVote } from '../../hooks';
import { useAuth } from '../../context/AuthContext';

export const Voting: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useActiveVoting(page);
  const { user } = useAuth();
  const voteMutation = useVote();

  const handleVote = (pollId: string, optionId: string) => {
    if (!user) return;
    voteMutation.mutate(
      { pollId, userId: user.id, optionId },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  };
  const hasActivePolls = (data?.data?.length ?? 0) > 0;
  let votingContent: React.ReactNode;

  if (isLoading) {
    votingContent = (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  } else if (hasActivePolls) {
    const polls = data?.data ?? [];
    const totalPages = data?.total_pages ?? 0;
    votingContent = (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {polls.map((poll) => (
            <VotingCard
              key={poll.id}
              poll={poll}
              onVote={(p, option) => handleVote(p.id, option)}
            />
          ))}
        </div>

        {totalPages > 1 && (
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
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-dark-200 rounded-lg disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </>
    );
  } else {
    votingContent = (
      <div className="bg-white rounded-lg border border-dark-200 p-10 text-center">
        <p className="text-dark-600 text-lg">No hay votaciones activas en este momento</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-dark-200 p-6">
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Votaciones</h1>
        <p className="text-dark-600">
          Participa en las decisiones democráticas del grupo
        </p>
      </div>

      {error && (
        <Alert type="error" message="No se pudieron cargar las votaciones. Intenta de nuevo." />
      )}
      {votingContent}
    </div>
  );
};
