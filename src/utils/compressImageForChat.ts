const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_EDGE_PX = 1280;
const WEBP_QUALITY_START = 0.82;
const JPEG_QUALITY_START = 0.86;
const MIN_QUALITY = 0.45;
const TARGET_MAX_OUTPUT_BYTES = 1.75 * 1024 * 1024;

const DISALLOWED_MIME = new Set(['image/svg+xml', 'image/svg']);

export type CompressedChatImage = {
  blob: Blob;
  contentType: 'image/webp' | 'image/jpeg';
};

function rejectIfUnsafeType(file: File): void {
  const type = file.type.toLowerCase();
  if (DISALLOWED_MIME.has(type)) {
    throw new Error('Formato no permitido (SVG). Usa JPEG, PNG o WebP.');
  }
  if (!type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen.');
  }
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo cargar la imagen.'));
    };
    image.src = objectUrl;
  });
}

function computeScaledSize(
  naturalWidth: number,
  naturalHeight: number,
  maxEdge: number
): { width: number; height: number } {
  if (naturalWidth <= maxEdge && naturalHeight <= maxEdge) {
    return { width: naturalWidth, height: naturalHeight };
  }
  const ratio = Math.min(maxEdge / naturalWidth, maxEdge / naturalHeight);
  return {
    width: Math.max(1, Math.round(naturalWidth * ratio)),
    height: Math.max(1, Math.round(naturalHeight * ratio)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function encodeBestEffort(
  canvas: HTMLCanvasElement,
  webpQuality: number,
  jpegQuality: number
): Promise<CompressedChatImage | null> {
  const webpBlob = await canvasToBlob(canvas, 'image/webp', webpQuality);
  if (webpBlob && webpBlob.size > 0) {
    return { blob: webpBlob, contentType: 'image/webp' };
  }
  const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', jpegQuality);
  if (jpegBlob && jpegBlob.size > 0) {
    return { blob: jpegBlob, contentType: 'image/jpeg' };
  }
  return null;
}

/**
 * Redimensiona y comprime una imagen en el navegador para el chat (menos peso en Storage y en red).
 */
export async function compressImageForChat(file: File): Promise<CompressedChatImage> {
  rejectIfUnsafeType(file);
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('La imagen original no puede superar 15 MB.');
  }

  const image = await loadImageFromFile(file);
  const { width, height } = computeScaledSize(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    MAX_EDGE_PX
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Tu navegador no permite procesar imágenes en el chat.');
  }
  context.drawImage(image, 0, 0, width, height);

  let webpQ = WEBP_QUALITY_START;
  let jpegQ = JPEG_QUALITY_START;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const encoded = await encodeBestEffort(canvas, webpQ, jpegQ);
    if (encoded && encoded.blob.size <= TARGET_MAX_OUTPUT_BYTES) {
      return encoded;
    }
    webpQ = Math.max(MIN_QUALITY, webpQ - 0.07);
    jpegQ = Math.max(MIN_QUALITY, jpegQ - 0.07);
  }

  const lastChance = await encodeBestEffort(canvas, MIN_QUALITY, MIN_QUALITY);
  if (!lastChance) {
    throw new Error('No se pudo comprimir la imagen.');
  }
  return lastChance;
}
