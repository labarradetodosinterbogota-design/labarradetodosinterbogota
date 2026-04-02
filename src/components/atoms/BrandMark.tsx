import React from 'react';

type BrandMarkProps = {
  /** Ajustes de borde/sombra según fondo del header (oscuro vs claro) */
  variant?: 'onDark' | 'onLight';
};

export const BrandMark: React.FC<BrandMarkProps> = ({ variant = 'onLight' }) => {
  const frame =
    variant === 'onDark'
      ? 'border border-white/20 bg-white shadow-sm'
      : 'border border-dark-200/80 bg-white shadow-sm';

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ${frame}`}
    >
      <img
        src="/favicon.svg"
        alt=""
        width={40}
        height={40}
        decoding="async"
        className="h-full w-full object-contain p-0.5"
      />
    </div>
  );
};
