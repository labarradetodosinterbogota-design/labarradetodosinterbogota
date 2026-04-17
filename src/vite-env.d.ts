/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * `false` desactiva resize WebP en miniaturas de galería (URL original).
   * Por defecto se usan Image Transformations de Supabase Storage.
   */
  readonly VITE_GALLERY_IMAGE_TRANSFORMS?: string;
  /** ID de medición GA4 (G-XXXXXXXX). Solo si no usas GTM para cargar GA. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** Contenedor Google Tag Manager (GTM-XXXXXXX). Prioridad sobre GA directo. */
  readonly VITE_GTM_CONTAINER_ID?: string;
}
