import React, { useEffect, useRef, useState } from 'react';

const IFRAME_HEIGHT_PX = 620;

interface LazyInstagramEmbedProps {
  src: string;
  title: string;
  className?: string;
}

/**
 * Carga el iframe del embed solo cuando el bloque entra (o está cerca) del viewport.
 * Evita inicializar los scripts de Instagram hasta que haga falta, mejorando el scroll.
 */
export const LazyInstagramEmbed: React.FC<LazyInstagramEmbedProps> = ({ src, title, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const globalWindow = globalThis.window;
    if (!globalWindow) return;

    const el = containerRef.current;
    if (!el) return;

    if (!('IntersectionObserver' in globalWindow)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          observer.disconnect();
          setShouldLoad(true);
        }
      },
      { root: null, rootMargin: '320px 0px', threshold: 0 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: IFRAME_HEIGHT_PX }}
    >
      {shouldLoad ? (
        <iframe
          src={src}
          title={title}
          className="block w-full border-0"
          height={IFRAME_HEIGHT_PX}
          allow="encrypted-media; autoplay; clipboard-write; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div
          className="flex min-h-[620px] w-full items-center justify-center rounded-b-xl bg-gradient-to-b from-dark-100 to-white"
          aria-hidden
        >
          <div className="h-10 w-10 rounded-full bg-dark-200" />
        </div>
      )}
    </div>
  );
};
