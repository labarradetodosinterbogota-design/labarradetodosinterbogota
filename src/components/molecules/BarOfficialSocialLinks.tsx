import React from 'react';
import { BAR_OFFICIAL_FACEBOOK_URL, BAR_OFFICIAL_INSTAGRAM_URL } from '../../constants/brand';

interface BarOfficialSocialLinksProps {
  variant?: 'onDark' | 'onLight';
  className?: string;
}

export const BarOfficialSocialLinks: React.FC<BarOfficialSocialLinksProps> = ({
  variant = 'onDark',
  className = '',
}) => {
  const linkClass =
    variant === 'onDark'
      ? 'text-dark-300 hover:text-primary-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400 focus-visible:outline-offset-2'
      : 'text-dark-600 hover:text-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400 focus-visible:outline-offset-2';

  return (
    <nav
      className={`flex flex-wrap gap-x-6 gap-y-2 ${className}`.trim()}
      aria-label="Redes sociales oficiales de la barra"
    >
      <a
        href={BAR_OFFICIAL_INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-sm font-medium transition-colors underline-offset-2 hover:underline ${linkClass}`}
      >
        Instagram
      </a>
      <a
        href={BAR_OFFICIAL_FACEBOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-sm font-medium transition-colors underline-offset-2 hover:underline ${linkClass}`}
      >
        Facebook
      </a>
    </nav>
  );
};
