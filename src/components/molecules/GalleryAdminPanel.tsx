import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBarraGallery, useGalleryDelete, useGalleryUpload } from '../../hooks';
import { galleryService } from '../../services/galleryService';
import type { BarraGalleryItem } from '../../types';
import { Alert, Button, Input, Spinner } from '../atoms';

export const GalleryAdminPanel: React.FC = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: items, isLoading } = useBarraGallery();
  const upload = useGalleryUpload();
  const del = useGalleryDelete();

  const handlePick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    try {
      await upload.mutateAsync({ file, userId: user.id, caption: caption.trim() || null });
      setCaption('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No se pudo subir la imagen');
    }
  };

  const handleDelete = async (item: BarraGalleryItem) => {
    setLocalError(null);
    setDeletingId(item.id);
    try {
      await del.mutateAsync(item);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No se pudo eliminar la imagen');
    } finally {
      setDeletingId(null);
    }
  };

  const uploadErrorText =
    upload.error instanceof Error ? upload.error.message : 'Error al subir';

  let galleryList: React.ReactNode;
  if (isLoading) {
    galleryList = (
      <div className="flex justify-center border-t border-dark-200 py-8">
        <Spinner />
      </div>
    );
  } else if (items && items.length > 0) {
    galleryList = (
      <ul className="grid grid-cols-2 gap-3 border-t border-dark-200 pt-4 sm:grid-cols-4">
        {items.map((item) => {
          const url = galleryService.getPublicUrl(item.storage_path);
          const busy = deletingId === item.id;
          return (
            <li key={item.id} className="flex flex-col gap-2">
              <img
                src={url}
                alt={item.caption?.trim() || 'Galería'}
                className="aspect-square rounded-lg border border-dark-200 object-cover"
                loading="lazy"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1 border-red-200 text-red-700 hover:bg-red-50"
                isLoading={busy}
                onClick={() => void handleDelete(item)}
                aria-label="Eliminar foto"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            </li>
          );
        })}
      </ul>
    );
  } else {
    galleryList = (
      <p className="border-t border-dark-200 pt-4 text-sm text-dark-500">No hay fotos en la galería.</p>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-dark-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <ImagePlus className="h-6 w-6 text-primary-400" />
        <h3 className="font-semibold text-dark-900">Galería de fotos (inicio)</h3>
      </div>
      <p className="text-sm text-dark-600">
        Las imágenes se muestran en la página de inicio. Storage:{' '}
        <code className="rounded bg-dark-100 px-1 text-xs">barra-gallery</code>. JPEG, PNG, WebP o GIF,
        máximo 5 MB. Solo coordinadores pueden subir o eliminar.
      </p>
      {(localError || upload.isError) && (
        <Alert type="error" message={localError ?? uploadErrorText} />
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFile}
      />

      <Input
        label="Leyenda (opcional)"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        disabled={upload.isPending}
      />

      <Button
        type="button"
        variant="primary"
        onClick={handlePick}
        disabled={upload.isPending || !user}
        isLoading={upload.isPending}
      >
        Subir imagen
      </Button>

      {galleryList}
    </div>
  );
};
