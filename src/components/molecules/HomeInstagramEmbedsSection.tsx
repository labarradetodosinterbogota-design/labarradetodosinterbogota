import React from 'react';
import { Clapperboard } from 'lucide-react';
import { Spinner } from '../atoms';
import { useHomepageInstagramEmbeds, useHomepageInstagramProfile } from '../../hooks/useHomepageInstagramEmbeds';
import { buildInstagramEmbedSrc } from '../../utils/instagramEmbedUrl';

const IFRAME_HEIGHT_PX = 620;

type ResolvedPublicEmbed = {
  id: string;
  title: string | null;
  permalink: string;
  src: string;
};

function mapRowsToEmbeds(
  rows: ReadonlyArray<{ id: string; title: string | null; permalink: string }>
): ResolvedPublicEmbed[] {
  return rows.flatMap((row) => {
    const src = buildInstagramEmbedSrc(row.permalink);
    if (!src) return [];
    return [{ id: row.id, title: row.title, permalink: row.permalink, src }];
  });
}

export const HomeInstagramEmbedsSection: React.FC = () => {
  const embedsQuery = useHomepageInstagramEmbeds();
  const profileQuery = useHomepageInstagramProfile();

  if (embedsQuery.isLoading || profileQuery.isLoading) {
    return (
      <section className="flex justify-center rounded-2xl border border-dark-200 bg-white px-6 py-12 shadow-sm">
        <Spinner size="lg" />
      </section>
    );
  }

  if (embedsQuery.isError) {
    return null;
  }

  const items = mapRowsToEmbeds(embedsQuery.data ?? []);
  const profileUrl = profileQuery.data?.trim() ?? '';
  const showProfileLink = profileUrl.length > 0;

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-dark-200 bg-white px-6 py-10 shadow-sm">
      <div className="mx-auto max-w-5xl text-center mb-8">
        <div className="inline-flex items-center justify-center gap-2 text-primary-400 mb-2">
          <Clapperboard className="h-8 w-8" aria-hidden />
        </div>
        <h2 className="text-3xl font-bold text-dark-900">Instagram oficial</h2>
        <p className="mt-2 text-lg text-dark-600 max-w-2xl mx-auto">
          Momentos recientes de la barra con el equipo: mira los videos aquí sin salir de la página.
        </p>
        {showProfileLink && (
          <div className="mt-4">
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-primary-400 px-4 py-2 text-base font-medium text-primary-400 transition-colors hover:bg-primary-50"
            >
              Ver perfil en Instagram
            </a>
          </div>
        )}
      </div>

      <div
        className={`mx-auto grid max-w-6xl gap-8 ${
          items.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="mx-auto w-full max-w-[540px] overflow-hidden rounded-xl border border-dark-200 bg-dark-50 shadow-md"
          >
            {item.title ? (
              <p className="px-4 py-3 text-center text-sm font-semibold text-dark-900 border-b border-dark-100">
                {item.title}
              </p>
            ) : null}
            <div className="bg-white">
              <iframe
                src={item.src}
                title={item.title ?? 'Publicación de Instagram de la barra'}
                className="block w-full border-0"
                height={IFRAME_HEIGHT_PX}
                allow="encrypted-media; autoplay; clipboard-write; fullscreen"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
