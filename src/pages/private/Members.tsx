import React, { useEffect, useState } from 'react';
import { SearchBar, MemberCard, MemberAdminManageModal } from '../../components/molecules';
import { Spinner, Alert, Button } from '../../components/atoms';
import { useMembers, useMemberSearch } from '../../hooks';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export const Members: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [managingId, setManagingId] = useState<string | null>(null);
  const { user } = useAuth();
  const isCoordinatorAdmin = user?.role === UserRole.COORDINATOR_ADMIN;

  const membersQuery = useMembers(page);
  const searchResult = useMemberSearch(searchQuery, page);

  const isSearching = searchQuery.length > 0;
  const { data, isLoading, error } = isSearching ? searchResult : membersQuery;

  const managingMember = data?.data.find((m) => m.id === managingId) ?? null;

  useEffect(() => {
    if (!managingId || !data?.data) return;
    const stillVisible = data.data.some((m) => m.id === managingId);
    if (!stillVisible) setManagingId(null);
  }, [managingId, data?.data]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  let directoryBody: React.ReactNode;
  if (isLoading) {
    directoryBody = (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  } else if (data?.data && data.data.length > 0) {
    directoryBody = (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.data.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              actions={
                isCoordinatorAdmin ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setManagingId(member.id)}>
                    Gestionar
                  </Button>
                ) : undefined
              }
            />
          ))}
        </div>

        {data.total_pages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-lg border border-dark-200 bg-white px-4 py-3 shadow-sm">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(Math.max(1, page - 1))}
              >
                Anterior
              </Button>
              <span className="px-2 text-sm font-medium text-dark-900">
                Página {page} de {data.total_pages}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page === data.total_pages}
                onClick={() => setPage(Math.min(data.total_pages, page + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </>
    );
  } else {
    directoryBody = (
      <div className="text-center py-12">
        <p className="text-dark-600 text-lg">
          {isSearching ? 'No se encontraron integrantes' : 'Aún no hay integrantes registrados'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-dark-200 p-6">
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Directorio de integrantes</h1>
        <p className="text-dark-600">
          Conoce a otros integrantes de la barra
          {isCoordinatorAdmin && (
            <span className="block mt-2 text-sm text-dark-500">
              Como coordinador puedes gestionar integrantes con el botón «Gestionar» en cada tarjeta.
            </span>
          )}
        </p>
      </div>

      <SearchBar onSearch={handleSearch} placeholder="Buscar por nombre o carné…" />

      {error && (
        <Alert type="error" message="No se pudo cargar el directorio. Intenta de nuevo." />
      )}

      {directoryBody}

      <MemberAdminManageModal
        member={managingMember}
        currentUserId={user?.id ?? ''}
        isOpen={managingId !== null && managingMember !== null}
        onClose={() => setManagingId(null)}
        onDeleted={() => setManagingId(null)}
      />
    </div>
  );
};
