/**
 * Google Tag Manager + GA4 vía dataLayer.
 * - Con `VITE_GTM_CONTAINER_ID`: carga el contenedor GTM (recomendado; GA4 se configura en la UI de GTM).
 * - Sin GTM pero con `VITE_GA_MEASUREMENT_ID`: carga gtag.js directo (modo anterior).
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type AppAnalyticsPayload = Record<string, string | number | boolean | undefined>;

const eventOnceKeys = new Set<string>();
let googleAnalyticsInitialized = false;
let googleTagManagerInitialized = false;

/** En el navegador, `globalThis.window` es el objeto `Window`. */
function browserWindow(): Window | undefined {
  if (globalThis.window === undefined) {
    return undefined;
  }
  return globalThis.window;
}

function sanitizeParams(params?: AppAnalyticsPayload): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Google Tag Manager (snippet oficial adaptado). Requiere `VITE_GTM_CONTAINER_ID` (ej. GTM-NJRJPKVV).
 */
export function initGoogleTagManager(): void {
  if (googleTagManagerInitialized) return;
  const containerId = import.meta.env.VITE_GTM_CONTAINER_ID?.trim();
  const doc = globalThis.document;
  const w = browserWindow();
  if (!containerId || doc === undefined || !w) return;

  googleTagManagerInitialized = true;

  const layer = (w.dataLayer = w.dataLayer ?? []);
  layer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = doc.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
  const firstScript = doc.getElementsByTagName('script')[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    doc.head.appendChild(script);
  }

  const noscript = doc.createElement('noscript');
  const iframe = doc.createElement('iframe');
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(containerId)}`;
  iframe.height = '0';
  iframe.width = '0';
  iframe.setAttribute('style', 'display:none;visibility:hidden');
  noscript.appendChild(iframe);
  doc.body.insertBefore(noscript, doc.body.firstChild);
}

/**
 * GA4 directo (solo si no usas GTM). Requiere `VITE_GA_MEASUREMENT_ID`.
 */
export function initGoogleAnalytics(): void {
  if (googleAnalyticsInitialized) return;
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  const doc = globalThis.document;
  const w = browserWindow();
  if (!measurementId || doc === undefined || !w) return;

  googleAnalyticsInitialized = true;

  const layer = (w.dataLayer = w.dataLayer ?? []);
  w.gtag = function gtag(...args: unknown[]) {
    layer.push(args);
  };
  w.gtag('js', new Date());
  w.gtag('config', measurementId);

  const script = doc.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  doc.head.appendChild(script);
}

/**
 * Arranque recomendado: GTM si hay contenedor; si no, GA directo.
 */
export function initAnalytics(): void {
  const gtmId = import.meta.env.VITE_GTM_CONTAINER_ID?.trim();
  if (gtmId) {
    initGoogleTagManager();
    return;
  }
  initGoogleAnalytics();
}

export function trackAppEvent(eventName: string, params?: AppAnalyticsPayload): void {
  const clean = sanitizeParams(params);

  if (import.meta.env.DEV) {
    console.debug(`[analytics] ${eventName}`, clean ?? {});
  }

  const w = browserWindow();
  if (!w) return;

  if (typeof w.gtag === 'function') {
    w.gtag('event', eventName, clean);
  }

  const dl = w.dataLayer;
  if (Array.isArray(dl)) {
    dl.push({ event: eventName, ...clean });
  }
}

/** Evita duplicados (p. ej. React StrictMode en desarrollo). */
export function trackAppEventOnce(dedupeKey: string, eventName: string, params?: AppAnalyticsPayload): void {
  if (eventOnceKeys.has(dedupeKey)) return;
  eventOnceKeys.add(dedupeKey);
  trackAppEvent(eventName, params);
}
