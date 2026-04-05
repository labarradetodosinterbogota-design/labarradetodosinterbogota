import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Input, Select, Spinner, TextArea } from '../../components/atoms';
import { useAllDocuments, useCreateDocument, useUploadDocument } from '../../hooks';
import { documentCategoryLabels } from '../../locales/es';
import { useAuth } from '../../context/AuthContext';
import { documentService } from '../../services/documentService';
import { DocumentCategory } from '../../types';

export const AdminDocuments: React.FC = () => {
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DocumentCategory>(DocumentCategory.OTHER);
  const [isPublic, setIsPublic] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAllDocuments(page, 12);
  const uploadMutation = useUploadDocument();
  const createMutation = useCreateDocument();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['all-documents'] });
      void queryClient.invalidateQueries({ queryKey: ['public-documents'] });
      void queryClient.invalidateQueries({ queryKey: ['documents-category'] });
    },
  });

  const handleCreateDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!user) {
      setMessage({ type: 'error', text: 'No hay sesión activa para subir documentos.' });
      return;
    }

    const safeTitle = title.trim();
    if (!safeTitle) {
      setMessage({ type: 'error', text: 'El título es obligatorio.' });
      return;
    }
    if (!file) {
      setMessage({ type: 'error', text: 'Debes seleccionar un archivo.' });
      return;
    }

    try {
      const fileUrl = await uploadMutation.mutateAsync(file);
      await createMutation.mutateAsync({
        userId: user.id,
        document: {
          title: safeTitle,
          description: description.trim() || null,
          category,
          file_url: fileUrl,
          is_public: isPublic,
          uploaded_by: user.id,
        },
      });
      setTitle('');
      setDescription('');
      setCategory(DocumentCategory.OTHER);
      setIsPublic(true);
      setFile(null);
      setMessage({ type: 'success', text: 'Documento creado correctamente.' });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo crear el documento.' });
    }
  };

  const handleDelete = async (documentId: string) => {
    const accepted = globalThis.confirm('Esta acción eliminará el documento. ¿Deseas continuar?');
    if (!accepted) return;

    setMessage(null);
    try {
      await deleteMutation.mutateAsync(documentId);
      setMessage({ type: 'success', text: 'Documento eliminado correctamente.' });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo eliminar el documento.' });
    }
  };

  const isBusy = uploadMutation.isPending || createMutation.isPending || deleteMutation.isPending;
  const hasDocuments = (data?.data?.length ?? 0) > 0;
  let documentsContent: React.ReactNode;

  if (isLoading) {
    documentsContent = (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  } else if (hasDocuments) {
    documentsContent = (
      <div className="bg-white rounded-lg border border-dark-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-dark-50 text-left text-dark-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Documento</th>
              <th className="px-4 py-3 font-semibold">Categoría</th>
              <th className="px-4 py-3 font-semibold">Visibilidad</th>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.data?.map((doc) => (
              <tr key={doc.id} className="border-t border-dark-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-dark-900">{doc.title}</p>
                  {doc.description && <p className="text-dark-500">{doc.description}</p>}
                </td>
                <td className="px-4 py-3 text-dark-700">{documentCategoryLabels[doc.category]}</td>
                <td className="px-4 py-3">
                  <Badge variant={doc.is_public ? 'success' : 'secondary'}>
                    {doc.is_public ? 'Público' : 'Privado'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-dark-700">
                  {new Date(doc.uploaded_at).toLocaleDateString('es-CO')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => globalThis.open(doc.file_url, '_blank', 'noopener,noreferrer')}
                    >
                      Ver
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      isLoading={isBusy}
                      onClick={() => {
                        void handleDelete(doc.id);
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
    documentsContent = (
      <div className="bg-white rounded-lg border border-dark-200 p-8 text-center text-dark-600">
        No hay documentos registrados.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-dark-200 p-6">
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Gestión de documentos</h1>
        <p className="text-dark-600">
          Publica documentos oficiales y administra su visibilidad para integrantes y público.
        </p>
      </div>

      {message && <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />}

      <form onSubmit={handleCreateDocument} className="bg-white rounded-lg border border-dark-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-dark-900">Subir documento</h2>
        <Input
          label="Título"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <TextArea
          label="Descripción"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Select
          label="Categoría"
          value={category}
          onChange={(event) => setCategory(event.target.value as DocumentCategory)}
          options={Object.values(DocumentCategory).map((item) => ({
            value: item,
            label: documentCategoryLabels[item],
          }))}
        />
        <div>
          <label htmlFor="admin-document-file" className="block text-sm font-medium text-dark-900 mb-1.5">
            Archivo
          </label>
          <input
            id="admin-document-file"
            type="file"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="w-full px-3 py-2 border border-dark-200 rounded-lg bg-white"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-dark-800">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(event) => setIsPublic(event.target.checked)}
            className="rounded border-dark-300"
          />
          <span>Documento público</span>
        </label>
        <div>
          <Button type="submit" variant="primary" isLoading={uploadMutation.isPending || createMutation.isPending}>
            Guardar documento
          </Button>
        </div>
      </form>

      {error && <Alert type="error" message="No se pudieron cargar los documentos." />}
      {documentsContent}

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
