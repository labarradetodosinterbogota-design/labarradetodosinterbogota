import React, { useState } from 'react';
import { SearchBar, ChantCard, Modal } from '../../components/molecules';
import { Spinner, Alert } from '../../components/atoms';
import { useChants, useChantSearch } from '../../hooks';
import { Chant } from '../../types';
import { chantStatusLabels } from '../../locales/es';

const EMPTY_VTT_TRACK_SRC = 'data:text/vtt;charset=utf-8,WEBVTT%0A%0A';

export const ChantsLibrary: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChant, setSelectedChant] = useState<Chant | null>(null);

  const chantsQuery = useChants(page);
  const searchQueryResult = useChantSearch(searchQuery, page);

  const isSearching = searchQuery.length > 0;
  const { data, isLoading, error } = isSearching ? searchQueryResult : chantsQuery;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  let selectedStatusLabel: string | null = null;
  if (selectedChant !== null) {
    selectedStatusLabel = chantStatusLabels[selectedChant.status] ?? selectedChant.status;
  }

  let chantsContent: React.ReactNode;
  if (isLoading) {
    chantsContent = (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  } else if (data?.data && data.data.length > 0) {
    chantsContent = (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.data.map((chant) => (
            <ChantCard key={chant.id} chant={chant} onSelect={setSelectedChant} />
          ))}
        </div>

        {data.total_pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg border border-dark-200 px-4 py-2 text-dark-900 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-dark-900">
              Página {page} de {data.total_pages}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(data.total_pages, page + 1))}
              disabled={page === data.total_pages}
              className="rounded-lg border border-dark-200 px-4 py-2 text-dark-900 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </>
    );
  } else {
    chantsContent = (
      <div className="rounded-xl border border-dark-200 bg-white/95 px-6 py-12 text-center shadow-sm backdrop-blur-sm">
        <p className="text-lg text-dark-900">
          {isSearching
            ? 'No hay cantos que coincidan con tu búsqueda'
            : 'Aún no hay cantos publicados'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/10 bg-dark-900/90 px-6 py-8 shadow-lg backdrop-blur-sm">
        <h1 className="text-4xl font-bold text-white mb-2">Biblioteca de cantos</h1>
        <p className="text-lg text-dark-200">Cantos que identifican a nuestra hinchada</p>
      </header>

      <SearchBar onSearch={handleSearch} placeholder="Buscar por título o letra…" />

      {error && (
        <Alert type="error" message="No se pudieron cargar los cantos. Intenta de nuevo." />
      )}

      {chantsContent}

      <Modal
        isOpen={selectedChant !== null}
        onClose={() => setSelectedChant(null)}
        title={selectedChant?.title ?? 'Detalle del cántico'}
        size="lg"
      >
        {selectedChant && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-dark-600">
              <span className="rounded-full bg-dark-100 px-3 py-1 font-medium text-dark-800">
                {selectedChant.category}
              </span>
              {selectedStatusLabel && (
                <span className="rounded-full bg-primary-100 px-3 py-1 font-medium text-primary-800">
                  {selectedStatusLabel}
                </span>
              )}
            </div>

            <div className="max-h-[55vh] overflow-auto rounded-lg border border-dark-200 bg-dark-50 p-4">
              <p className="whitespace-pre-line text-dark-900">{selectedChant.lyrics}</p>
            </div>

            {selectedChant.audio_url && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-dark-800">Audio</p>
                <audio controls preload="none" className="w-full">
                  <source src={selectedChant.audio_url} />
                  <track
                    kind="captions"
                    src={EMPTY_VTT_TRACK_SRC}
                    srcLang="es"
                    label="Subtítulos no disponibles"
                    default
                  />
                  Tu navegador no soporta reproducción de audio.
                </audio>
              </div>
            )}

            {selectedChant.video_url && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-dark-800">Video</p>
                <a
                  href={selectedChant.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-500 hover:text-primary-600 underline break-all"
                >
                  Abrir video del cántico
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
