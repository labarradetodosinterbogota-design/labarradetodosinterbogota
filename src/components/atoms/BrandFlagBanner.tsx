import React from 'react';
import {
  BAR_FLAG_BANNER_ASSET_PATH,
  BAR_FLAG_BANNER_FALLBACK_ASSET_PATH,
  BAR_OFFICIAL_NAME,
} from '../../constants/brand';

type BrandFlagBannerProps = {
  className?: string;
};

export const BrandFlagBanner: React.FC<BrandFlagBannerProps> = ({ className = '' }) => {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-dark-200/80 bg-white/95 px-2 py-2 shadow-sm ${className}`.trim()}
    >
      <picture>
        <source srcSet={BAR_FLAG_BANNER_ASSET_PATH} type="image/webp" />
        <img
          src={BAR_FLAG_BANNER_FALLBACK_ASSET_PATH}
          alt={`Bandera ${BAR_OFFICIAL_NAME}`}
          decoding="async"
          loading="lazy"
          className="mx-auto h-20 w-auto max-w-full object-contain sm:h-24 md:h-28"
        />
      </picture>
    </div>
  );
};
