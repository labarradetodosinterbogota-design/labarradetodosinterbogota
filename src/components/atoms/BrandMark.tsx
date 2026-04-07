import React from 'react';
import {
  BAR_OFFICIAL_NAME,
  BAR_SHIELD_ASSET_PATH,
  BAR_SHIELD_FALLBACK_ASSET_PATH,
} from '../../constants/brand';

type BrandMarkProps = {
  /** Ajustes de borde/sombra según fondo del header (oscuro vs claro) */
  variant?: 'onDark' | 'onLight';
};

export const BrandMark: React.FC<BrandMarkProps> = ({ variant = 'onLight' }) => {
  const frame =
    variant === 'onDark'
      ? 'border border-white/25 bg-white shadow-sm'
      : 'border border-dark-200/90 bg-white shadow-sm';

  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ${frame}`}
    >
      <img
        src={BAR_SHIELD_ASSET_PATH}
        alt={`Escudo ${BAR_OFFICIAL_NAME}`}
        width={44}
        height={44}
        decoding="async"
        className="h-full w-full object-contain p-0.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]"
        onError={(event) => {
          const target = event.currentTarget;
          if (target.src.endsWith(BAR_SHIELD_FALLBACK_ASSET_PATH)) return;
          target.src = BAR_SHIELD_FALLBACK_ASSET_PATH;
        }}
      />
    </div>
  );
};
