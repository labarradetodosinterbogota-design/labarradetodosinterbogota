/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * `false` desactiva resize WebP en miniaturas de galería (URL original).
   * Por defecto se usan Image Transformations de Supabase Storage.
   */
  readonly VITE_GALLERY_IMAGE_TRANSFORMS?: string;
}
