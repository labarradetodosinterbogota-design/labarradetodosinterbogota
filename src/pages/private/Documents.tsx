import React, { useState } from 'react';
import { DocumentCard } from '../../components/molecules';
import { Spinner, Alert } from '../../components/atoms';
import { useAllDocuments, useDocumentsByCategory } from '../../hooks';
import { type Document, DocumentCategory } from '../../types';
import { documentCategoryLabels } from '../../locales/es';

const CATEGORIES = Object.values(DocumentCategory);

export const Documents: React.FC = () => {
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | null>(null);

  const allDocsQuery = useAllDocuments(page);
  const categoryQuery = useDocumentsByCategory(
    selectedCategory ?? DocumentCategory.CONSTITUTION,
    page,
    10,
    { enabled: selectedCategory !== null }
  );

  const { data, isLoading, error } = selectedCategory ? categoryQuery : allDocsQuery;
  const isAllSelected = selectedCategory === null;
  const hasDocuments = (data?.data?.length ?? 0) > 0;

  const handleDownload = (document: Document) => {
    window.open(document.file_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-dark-200 p-6">
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Documentos oficiales</h1>
        <p className="text-dark-600">
          Constitución, políticas e informes de transparencia
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory(null);
            setPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isAllSelected
              ? 'bg-primary-400 text-white'
              : 'bg-dark-100 text-dark-900 hover:bg-dark-200'
          }`}
        >
          Todos
        </button>
        {CATEGORIES.map((cat) => (
          <button
            type="button"
            key={cat}
            onClick={() => {
              setSelectedCategory(cat);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-primary-400 text-white'
                : 'bg-dark-100 text-dark-900 hover:bg-dark-200'
            }`}
          >
            {documentCategoryLabels[cat]}
          </button>
        ))}
      </div>

      {error && (
        <Alert type="error" message="No se pudieron cargar los documentos. Intenta de nuevo." />
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {!isLoading && hasDocuments && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.data?.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDownload={handleDownload}
              />
            ))}
          </div>

          {(data?.total_pages ?? 0) > 1 && (
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
                Página {page} de {data?.total_pages}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(data?.total_pages ?? page, page + 1))}
                disabled={page === (data?.total_pages ?? page)}
                className="px-4 py-2 border border-dark-200 rounded-lg disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {!isLoading && !hasDocuments && (
        <div className="text-center py-12">
          <p className="text-dark-600 text-lg">No hay documentos disponibles</p>
        </div>
      )}
    </div>
  );
};
