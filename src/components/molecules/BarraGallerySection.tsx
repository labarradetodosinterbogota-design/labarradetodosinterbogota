import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useBarraGallery } from '../../hooks';
import { galleryService } from '../../services/galleryService';
import { Spinner, Alert } from '../atoms';

const INITIAL_VISIBLE_ITEMS = 8;
const VISIBLE_ITEMS_STEP = 8;

export const BarraGallerySection: React.FC = () => {
  const { data, isLoading, error } = useBarraGallery();
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [activeAlt, setActiveAlt] = useState('');
  const [visibleItemsCount, setVisibleItemsCount] = useState(INITIAL_VISIBLE_ITEMS);
  const lightboxRef = useRef<HTMLDialogElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const galleryItems = React.useMemo(() => data ?? [], [data]);
  const visibleItems = React.useMemo(
    () => galleryItems.slice(0, visibleItemsCount),
    [galleryItems, visibleItemsCount]
  );
  const hasMoreItems = visibleItemsCount < galleryItems.length;

  useEffect(() => {
    const el = lightboxRef.current;
    if (!el) return;
    if (activeUrl) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [activeUrl]);

  const closeLightbox = () => {
    setActiveUrl(null);
    setActiveAlt('');
  };

  useEffect(() => {
    setVisibleItemsCount(INITIAL_VISIBLE_ITEMS);
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
      { rootMargin: '220px 0px' }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [galleryItems.length, hasMoreItems]);

  return (
    <section className="space-y-6" aria-labelledby="galeria-fotos-heading">
      <header className="rounded-2xl border border-white/10 bg-dark-900 px-6 py-8 shadow-lg">
        <h2 id="galeria-fotos-heading" className="text-3xl font-bold text-white">
          Galería de fotos
        </h2>
        <p className="mt-2 text-lg text-dark-200">Momentos de nuestra hinchada</p>
      </header>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {error && <Alert type="error" message="No se pudo cargar la galería. Intenta más tarde." />}

      {!isLoading && !error && (!data || data.length === 0) && (
        <div className="rounded-xl border border-dark-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-lg text-dark-900">
            Pronto compartiremos fotos de la barra. Vuelve a visitarnos.
          </p>
        </div>
      )}

      {!isLoading && galleryItems.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {visibleItems.map((item) => {
            const thumbUrl = galleryService.getGridDisplayUrl(item.storage_path);
            const fullUrl = galleryService.getPublicUrl(item.storage_path);
            const label = item.caption?.trim() || 'Foto de la hinchada';
            return (
              <article
                key={item.id}
                className="space-y-2 [contain:layout_paint] [content-visibility:auto] [contain-intrinsic-size:240px_280px]"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveUrl(fullUrl);
                    setActiveAlt(label);
                  }}
                  aria-label={`Ampliar: ${label}`}
                  className="group relative aspect-square w-full overflow-hidden rounded-xl border border-dark-200 bg-dark-900 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
                >
                  <img
                    src={thumbUrl}
                    alt={label}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    className="h-full w-full object-cover"
                  />
                </button>
                <p className="min-h-10 rounded-lg border border-dark-200 bg-white/95 px-2 py-1.5 text-left text-xs font-medium leading-5 text-dark-700 shadow-sm line-clamp-2">
                  {label}
                </p>
              </article>
            );
          })}
        </div>
      )}
      {!isLoading && hasMoreItems && (
        <div ref={loadMoreTriggerRef} className="flex justify-center py-2" aria-hidden="true">
          <Spinner size="sm" />
        </div>
      )}

      <dialog
        ref={lightboxRef}
        className="max-h-[95vh] max-w-[95vw] border-0 bg-transparent p-4 backdrop:bg-black/90 open:flex open:items-center open:justify-center"
        onClose={closeLightbox}
        aria-label={activeAlt || 'Vista ampliada'}
      >
        {activeUrl ? (
          <>
            <button
              type="button"
              className="fixed inset-0 cursor-default"
              aria-label="Cerrar vista ampliada"
              onClick={() => lightboxRef.current?.close()}
            />
            <div className="relative z-10 flex max-h-[90vh] max-w-full flex-col items-center">
              <button
                type="button"
                className="absolute -right-1 -top-10 z-20 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20 sm:-right-2 sm:-top-2"
                aria-label="Cerrar vista ampliada"
                onClick={() => lightboxRef.current?.close()}
              >
                <X className="h-6 w-6" />
              </button>
              <img
                src={activeUrl}
                alt={activeAlt}
                className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
              />
            </div>
          </>
        ) : null}
      </dialog>
    </section>
  );
};
