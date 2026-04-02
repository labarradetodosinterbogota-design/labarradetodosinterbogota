import React, { useState } from 'react';
import { SearchBar, ChantCard } from '../../components/molecules';
import { Spinner, Alert } from '../../components/atoms';
import { useChants, useChantSearch } from '../../hooks';

export const ChantsLibrary: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const chantsQuery = useChants(page);
  const searchQueryResult = useChantSearch(searchQuery, page);

  const isSearching = searchQuery.length > 0;
  const { data, isLoading, error } = isSearching ? searchQueryResult : chantsQuery;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Biblioteca de cantos</h1>
        <p className="text-dark-600">
          Cantos que identifican a nuestra hinchada
        </p>
      </div>

      <SearchBar onSearch={handleSearch} placeholder="Buscar por título o letra…" />

      {error && (
        <Alert type="error" message="No se pudieron cargar los cantos. Intenta de nuevo." />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.data.map((chant) => (
              <ChantCard key={chant.id} chant={chant} />
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
          <p className="text-dark-600 text-lg">
            {isSearching
              ? 'No hay cantos que coincidan con tu búsqueda'
              : 'Aún no hay cantos publicados'}
          </p>
        </div>
      )}
    </div>
  );
};
