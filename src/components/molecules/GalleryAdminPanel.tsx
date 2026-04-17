import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBarraGallery, useGalleryDelete, useGalleryUpload } from '../../hooks';
import { galleryService } from '../../services/galleryService';
import type { BarraGalleryItem } from '../../types';
import { Alert, Button, Input, Spinner } from '../atoms';

const INITIAL_VISIBLE_ITEMS = 12;
const VISIBLE_ITEMS_STEP = 12;

type GalleryGridItemData = BarraGalleryItem & {
  previewUrl: string;
};

interface GalleryGridItemProps {
  item: GalleryGridItemData;
  busy: boolean;
  onDelete: (item: BarraGalleryItem) => Promise<void>;
}

const GalleryGridItem: React.FC<GalleryGridItemProps> = React.memo(({ item, busy, onDelete }) => {
  return (
    <li
      className="flex flex-col gap-2"
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '240px',
      }}
    >
      <img
        src={item.previewUrl}
        alt={item.caption?.trim() || 'Galería'}
        className="aspect-square rounded-lg border border-dark-200 object-cover"
        loading="lazy"
        decoding="async"
        fetchPriority="low"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-1 border-red-200 text-red-700 hover:bg-red-50"
        isLoading={busy}
        onClick={() => void onDelete(item)}
        aria-label="Eliminar foto"
      >
        <Trash2 className="h-4 w-4" />
        Eliminar
      </Button>
    </li>
  );
});

GalleryGridItem.displayName = 'GalleryGridItem';

export const GalleryAdminPanel: React.FC = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const [caption, setCaption] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [visibleItemsCount, setVisibleItemsCount] = useState(INITIAL_VISIBLE_ITEMS);

  const { data: items, isLoading } = useBarraGallery();
  const upload = useGalleryUpload();
  const del = useGalleryDelete();
  const galleryItems = useMemo<GalleryGridItemData[]>(() => {
    if (!items) return [];
    return items.map((item) => ({
      ...item,
      previewUrl: galleryService.getGridDisplayUrl(item.storage_path),
    }));
  }, [items]);
  const visibleItems = useMemo(
    () => galleryItems.slice(0, visibleItemsCount),
    [galleryItems, visibleItemsCount]
  );
  const hasMoreItems = visibleItemsCount < galleryItems.length;

  const handlePick = () => fileRef.current?.click();

  useEffect(() => {
    setVisibleItemsCount((previous) => {
      if (galleryItems.length === 0) return 0;
      const desiredVisible = Math.max(previous, INITIAL_VISIBLE_ITEMS);
      return Math.min(desiredVisible, galleryItems.length);
    });
  }, [galleryItems.length]);

  useEffect(() => {
    if (!hasMoreItems) return;

    const globalWindow = globalThis.window;
    if (!globalWindow) return;

    const IntersectionObserverCtor = globalThis.IntersectionObserver;
    if (!IntersectionObserverCtor) {
      setVisibleItemsCount(galleryItems.length);
      return;
    }

    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserverCtor(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleItemsCount((previous) =>
          Math.min(previous + VISIBLE_ITEMS_STEP, galleryItems.length)
        );
      },
      { rootMargin: '240px 0px' }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [galleryItems.length, hasMoreItems]);

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

  const handleDelete = useCallback(async (item: BarraGalleryItem) => {
    setLocalError(null);
    setDeletingId(item.id);
    try {
      await del.mutateAsync(item);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No se pudo eliminar la imagen');
    } finally {
      setDeletingId(null);
    }
  }, [del]);

  const uploadErrorText =
    upload.error instanceof Error ? upload.error.message : 'Error al subir';

  let galleryList: React.ReactNode;
  if (isLoading) {
    galleryList = (
      <div className="flex justify-center border-t border-dark-200 py-8">
        <Spinner />
      </div>
    );
  } else if (galleryItems.length > 0) {
    galleryList = (
      <div className="space-y-3 border-t border-dark-200 pt-4">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {visibleItems.map((item) => (
            <GalleryGridItem
              key={item.id}
              item={item}
              busy={deletingId === item.id}
              onDelete={handleDelete}
            />
          ))}
        </ul>
        {hasMoreItems && (
          <div ref={loadMoreTriggerRef} className="flex items-center justify-center py-2" aria-hidden="true">
            <Spinner size="sm" />
          </div>
        )}
      </div>
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
