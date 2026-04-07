import React, { useState } from 'react';
import { Button, Alert, BrandMark } from '../../components/atoms';
import { Download, Image as ImageIcon, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import {
  BAR_FLAG_BANNER_ASSET_PATH,
  BAR_FLAG_BANNER_FALLBACK_ASSET_PATH,
  BAR_OFFICIAL_NAME,
  BAR_SHIELD_ASSET_PATH,
  BAR_SHIELD_FALLBACK_ASSET_PATH,
} from '../../constants/brand';

const loadImageAsset = (src: string): Promise<HTMLImageElement> =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar el logo.'));
    image.src = src;
  });

async function loadBrandLogoImage(): Promise<HTMLImageElement | null> {
  try {
    return await loadImageAsset(BAR_SHIELD_ASSET_PATH);
  } catch {
    try {
      return await loadImageAsset(BAR_SHIELD_FALLBACK_ASSET_PATH);
    } catch {
      return null;
    }
  }
}

async function loadBrandFlagImage(): Promise<HTMLImageElement | null> {
  try {
    return await loadImageAsset(BAR_FLAG_BANNER_ASSET_PATH);
  } catch {
    try {
      return await loadImageAsset(BAR_FLAG_BANNER_FALLBACK_ASSET_PATH);
    } catch {
      return null;
    }
  }
}

async function getBrandLogoDataUrl(): Promise<string | null> {
  try {
    const image = await loadBrandLogoImage();
    if (!image) return null;

    const canvas = globalThis.document?.createElement('canvas');
    if (!canvas) return null;

    canvas.width = image.naturalWidth || 64;
    canvas.height = image.naturalHeight || 64;
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.drawImage(image, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

const drawRoundedRectPath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void => {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
};

const fillRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void => {
  context.beginPath();
  drawRoundedRectPath(context, x, y, width, height, radius);
  context.closePath();
  context.fill();
};

const fitTextToWidth = (
  context: CanvasRenderingContext2D,
  rawText: string,
  maxWidth: number
): string => {
  const text = rawText.trim();
  if (context.measureText(text).width <= maxWidth) return text;
  let sliced = text;
  while (sliced.length > 0 && context.measureText(`${sliced}...`).width > maxWidth) {
    sliced = sliced.slice(0, -1);
  }
  return sliced.length > 0 ? `${sliced}...` : text;
};

const drawImageContained = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
): void => {
  const sourceWidth = image.naturalWidth || image.width || 1;
  const sourceHeight = image.naturalHeight || image.height || 1;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;
  let drawX = x;
  let drawY = y;

  if (sourceRatio > targetRatio) {
    drawHeight = width / sourceRatio;
    drawY = y + (height - drawHeight) / 2;
  } else {
    drawWidth = height * sourceRatio;
    drawX = x + (width - drawWidth) / 2;
  }

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
};

const CARD_SHIELD_PATTERN_STYLE: Readonly<React.CSSProperties> = {
  backgroundImage: `image-set(url("${BAR_SHIELD_ASSET_PATH}") type("image/webp"), url("${BAR_SHIELD_FALLBACK_ASSET_PATH}") type("image/png"))`,
  backgroundRepeat: 'repeat',
  backgroundPosition: 'center',
  backgroundSize: '56px 56px',
};
const MEMBERSHIP_FONT_STACK = 'Inter, "Segoe UI", Arial, sans-serif';

export const MembershipCard: React.FC = () => {
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingFrontImage, setIsDownloadingFrontImage] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  if (!user) return null;
  const joinYear = new Date(user.join_date).getFullYear();
  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  const verificationUrl = globalThis.window?.location?.origin
    ? `${globalThis.window.location.origin}/membership-card?uid=${encodeURIComponent(user.id)}`
    : '';
  const qrValue = [
    `barra=${BAR_OFFICIAL_NAME}`,
    `member_id=${user.member_id}`,
    `user_id=${user.id}`,
    `name=${user.full_name}`,
    `join_year=${joinYear}`,
    verificationUrl ? `verify_url=${verificationUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const handleDownloadPDF = async () => {
    setFeedback(null);
    setIsDownloading(true);
    try {
      const { default: JsPdf } = await import('jspdf');
      const { toDataURL } = await import('qrcode');
      const issuedAt = new Date().toLocaleDateString('es-CO');
      const doc = new JsPdf({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const logoDataUrl = await getBrandLogoDataUrl();
      const qrDataUrl = await toDataURL(qrValue, {
        width: 256,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
      });

      doc.setFillColor(20, 22, 30);
      doc.roundedRect(15, 20, 180, 90, 4, 4, 'F');
      doc.setTextColor(252, 211, 77);
      doc.setFontSize(15);
      doc.text(BAR_OFFICIAL_NAME, 22, 32);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text('Carné digital de integrante', 22, 39);

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(166, 25, 21, 21, 2, 2, 'F');
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', 169, 28, 15, 15, undefined, 'FAST');
      }
      doc.setFillColor(0, 0, 0);
      doc.roundedRect(169, 48, 15, 7, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(initials, 176.5, 52.6, { align: 'center' });

      doc.setFillColor(245, 186, 59);
      doc.setDrawColor(252, 211, 77);
      doc.roundedRect(22, 50, 166, 43, 2, 2, 'FD');

      doc.setFillColor(0, 0, 0);
      doc.roundedRect(26, 54, 158, 13, 1.5, 1.5, 'F');
      doc.roundedRect(26, 71, 76, 13, 1.5, 1.5, 'F');
      doc.roundedRect(108, 71, 76, 13, 1.5, 1.5, 'F');

      doc.setTextColor(170, 170, 170);
      doc.setFontSize(7);
      doc.text('NOMBRE', 30, 58);
      doc.text('CARNÉ', 30, 75);
      doc.text('INTEGRANTE DESDE', 112, 75);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(user.full_name, 30, 63, { maxWidth: 148 });
      doc.text(user.member_id, 30, 80, { maxWidth: 70 });
      doc.text(String(joinYear), 112, 80);
      doc.setTextColor(28, 33, 43);
      doc.setFontSize(9);
      doc.text(`Emitido: ${issuedAt}`, 24, 97);

      doc.setDrawColor(220, 225, 235);
      doc.roundedRect(15, 115, 180, 65, 3, 3);
      doc.setTextColor(28, 33, 43);
      doc.setFontSize(13);
      doc.text('Comprobante de membresía', 22, 129);
      doc.setFontSize(10);
      doc.text(
        'Este documento acredita tu membresía dentro de Barra Popular Legión Bacatá Inter Bogotá.',
        22,
        139,
        { maxWidth: 110 }
      );
      doc.text(
        'Presenta este carné en accesos y eventos oficiales del grupo cuando se requiera.',
        22,
        146,
        { maxWidth: 110 }
      );

      doc.setTextColor(28, 33, 43);
      doc.setFontSize(8);
      doc.text('QR DE VERIFICACION', 149, 130);
      doc.setFillColor(245, 186, 59);
      doc.setDrawColor(252, 211, 77);
      doc.roundedRect(146, 134, 42, 34, 2, 2, 'FD');
      doc.setFillColor(0, 0, 0);
      doc.roundedRect(150, 138, 34, 26, 1.5, 1.5, 'F');
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(157, 141, 20, 20, 1, 1, 'F');
      doc.addImage(qrDataUrl, 'PNG', 157.5, 141.5, 19, 19, undefined, 'FAST');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text('ESCANEA', 167, 166, { align: 'center' });

      doc.setFontSize(9);
      doc.setTextColor(90, 100, 120);
      doc.text(`ID de verificación: ${user.id}`, 22, 173);

      const fileName = `carne-${user.member_id}.pdf`;
      doc.save(fileName);

      setFeedback({ type: 'success', message: 'PDF generado correctamente.' });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Membership PDF error:', err);
      }
      setFeedback({ type: 'error', message: 'No se pudo generar el PDF del carné.' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadFrontImage = async () => {
    setFeedback(null);
    setIsDownloadingFrontImage(true);
    try {
      const canvas = globalThis.document?.createElement('canvas');
      if (!canvas) {
        throw new Error('No se pudo iniciar el canvas de descarga.');
      }
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('No se pudo inicializar el contexto gráfico.');
      }

      const width = 1400;
      const height = 860;
      canvas.width = width;
      canvas.height = height;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';

      const backgroundGradient = context.createLinearGradient(0, 0, width, height);
      backgroundGradient.addColorStop(0, '#121722');
      backgroundGradient.addColorStop(0.55, '#1C2330');
      backgroundGradient.addColorStop(1, '#0F1521');
      context.fillStyle = backgroundGradient;
      context.fillRect(0, 0, width, height);

      const logoImage = await loadBrandLogoImage();
      const flagImage = await loadBrandFlagImage();
      if (logoImage) {
        const tileSize = 96;
        context.globalAlpha = 0.11;
        for (let y = -24; y < height + tileSize; y += tileSize) {
          for (let x = -24; x < width + tileSize; x += tileSize) {
            context.drawImage(logoImage, x, y, tileSize, tileSize);
          }
        }
        context.globalAlpha = 1;
      }

      context.fillStyle = 'rgba(255,255,255,0.08)';
      fillRoundedRect(context, 44, 44, width - 88, height - 88, 28);
      context.fillStyle = 'rgba(255,255,255,0.07)';
      fillRoundedRect(context, 76, 198, width - 152, 320, 24);

      context.fillStyle = '#FFFFFF';
      context.font = `700 56px ${MEMBERSHIP_FONT_STACK}`;
      context.fillText(BAR_OFFICIAL_NAME, 86, 128, width - 340);
      context.fillStyle = 'rgba(255,255,255,0.82)';
      context.font = `500 30px ${MEMBERSHIP_FONT_STACK}`;
      context.fillText('Carné de integrante (frontal)', 86, 172);

      context.fillStyle = 'rgba(255,255,255,0.9)';
      fillRoundedRect(context, width - 220, 78, 130, 130, 18);
      if (logoImage) {
        context.drawImage(logoImage, width - 205, 93, 100, 100);
      }

      context.fillStyle = 'rgba(255,255,255,0.18)';
      fillRoundedRect(context, width - 220, 224, 130, 42, 12);
      context.textAlign = 'center';
      context.fillStyle = '#FFFFFF';
      context.font = `700 24px ${MEMBERSHIP_FONT_STACK}`;
      context.fillText(initials, width - 155, 252);
      context.textAlign = 'left';

      context.fillStyle = 'rgba(255,255,255,0.72)';
      context.font = `600 18px ${MEMBERSHIP_FONT_STACK}`;
      context.fillText('NOMBRE', 102, 248);
      context.fillStyle = '#FFFFFF';
      context.font = `700 44px ${MEMBERSHIP_FONT_STACK}`;
      const fittedName = fitTextToWidth(context, user.full_name, width - 214);
      context.fillText(fittedName, 102, 304);

      context.strokeStyle = 'rgba(255,255,255,0.2)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(96, 352);
      context.lineTo(width - 96, 352);
      context.stroke();

      context.fillStyle = 'rgba(255,255,255,0.72)';
      context.font = `600 18px ${MEMBERSHIP_FONT_STACK}`;
      context.fillText('CARNÉ', 102, 404);
      context.fillText('INTEGRANTE DESDE', 740, 404);

      context.fillStyle = '#FFFFFF';
      context.font = `700 38px ${MEMBERSHIP_FONT_STACK}`;
      context.fillText(user.member_id, 102, 456, 560);
      context.fillText(String(joinYear), 740, 456);

      if (flagImage) {
        context.fillStyle = 'rgba(255,255,255,0.92)';
        fillRoundedRect(context, 86, height - 196, width - 172, 82, 16);
        context.save();
        context.beginPath();
        drawRoundedRectPath(context, 92, height - 190, width - 184, 70, 12);
        context.closePath();
        context.clip();
        drawImageContained(context, flagImage, 92, height - 190, width - 184, 70);
        context.restore();
      }

      context.fillStyle = 'rgba(255,255,255,0.74)';
      context.font = `500 20px ${MEMBERSHIP_FONT_STACK}`;
      context.fillText('Versión frontal del carné (sin QR de verificación).', 86, height - 86);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), 'image/png');
      });
      if (!blob) {
        throw new Error('No se pudo generar la imagen del carné.');
      }

      const safeMemberId = user.member_id.replace(/[^a-zA-Z0-9-_]/g, '');
      const fileName = `carne-frontal-${safeMemberId || user.id}.png`;
      const downloadUrl = globalThis.URL.createObjectURL(blob);
      const anchor = globalThis.document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = fileName;
      anchor.click();
      globalThis.URL.revokeObjectURL(downloadUrl);

      setFeedback({ type: 'success', message: 'Imagen frontal del carné descargada correctamente.' });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Membership image download error:', err);
      }
      setFeedback({ type: 'error', message: 'No se pudo descargar la imagen frontal del carné.' });
    } finally {
      setIsDownloadingFrontImage(false);
    }
  };

  const handleShareCard = async () => {
    setFeedback(null);
    setIsSharing(true);
    try {
      const summary = [
        `Carné de integrante - ${BAR_OFFICIAL_NAME}`,
        `Nombre: ${user.full_name}`,
        `Carné: ${user.member_id}`,
        `Integrante desde: ${joinYear}`,
      ].join('\n');
      const url = globalThis.window?.location?.origin
        ? `${globalThis.window.location.origin}/membership-card`
        : undefined;

      if (globalThis.navigator?.share) {
        await globalThis.navigator.share({
          title: 'Carné digital de integrante',
          text: summary,
          url,
        });
        setFeedback({ type: 'success', message: 'Carné compartido correctamente.' });
        return;
      }

      if (globalThis.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(url ? `${summary}\n${url}` : summary);
        setFeedback({
          type: 'info',
          message: 'No hay Web Share disponible. Copiamos el texto del carné al portapapeles.',
        });
        return;
      }

      setFeedback({ type: 'error', message: 'Tu navegador no permite compartir ni copiar el carné.' });
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      if (!isAbort) {
        if (import.meta.env.DEV) {
          console.error('Membership share error:', err);
        }
        setFeedback({ type: 'error', message: 'No se pudo compartir el carné.' });
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg border border-dark-200 p-6 text-left">
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Carné digital de integrante</h1>
        <p className="text-dark-600">
          Comprobante de membresía para acceso y eventos del grupo
        </p>
      </div>

      <div className="space-y-8 max-w-2xl mx-auto">
        {feedback && <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

        <div className="perspective">
          <div className="relative max-w-md mx-auto overflow-hidden rounded-xl border border-white/25 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-8 text-white shadow-2xl">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={CARD_SHIELD_PATTERN_STYLE}
              aria-hidden="true"
            />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="font-bold text-white">{BAR_OFFICIAL_NAME}</h3>
                  <p className="text-sm text-white/80">Carné de integrante</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <BrandMark variant="onDark" />
                  <div className="rounded-md border border-white/30 bg-white/10 px-2 py-1 text-xs font-bold tracking-wider text-white">
                    {initials}
                  </div>
                </div>
              </div>

              <div className="mb-6 space-y-3 rounded-lg border border-white/25 bg-white/5 p-4">
                <div className="rounded-md border border-white/20 px-3 py-2">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-white/70">Nombre</p>
                  <p className="text-base font-bold text-white">{user.full_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-white/20 px-3 py-2">
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-white/70">Carné</p>
                    <p className="font-mono font-bold text-white">{user.member_id}</p>
                  </div>
                  <div className="rounded-md border border-white/20 px-3 py-2">
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-white/70">Integrante desde</p>
                    <p className="font-bold text-white">{new Date(user.join_date).getFullYear()}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/25 bg-white/5 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/85">
                  Código QR de verificación
                </p>
                <div className="rounded-md border border-white/20 bg-white/5 p-3">
                  <div className="flex h-28 w-full items-center justify-center rounded border border-white/20 bg-white/5 px-2">
                    <div className="rounded-md bg-white p-2 shadow-sm">
                      <QRCodeSVG value={qrValue} size={96} bgColor="#ffffff" fgColor="#000000" level="M" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-white/25 bg-white/95 p-1.5">
                <picture>
                  <source srcSet={BAR_FLAG_BANNER_ASSET_PATH} type="image/webp" />
                  <img
                    src={BAR_FLAG_BANNER_FALLBACK_ASSET_PATH}
                    alt={`Bandera ${BAR_OFFICIAL_NAME}`}
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-full object-contain"
                  />
                </picture>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              void handleDownloadPDF();
            }}
            isLoading={isDownloading}
            disabled={isSharing || isDownloadingFrontImage}
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => {
              void handleDownloadFrontImage();
            }}
            isLoading={isDownloadingFrontImage}
            disabled={isDownloading || isSharing}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Descargar imagen frontal
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            type="button"
            onClick={() => {
              void handleShareCard();
            }}
            isLoading={isSharing}
            disabled={isDownloading || isDownloadingFrontImage}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartir carné
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="text-blue-900">
            <strong>Nota:</strong> Este carné acredita tu membresía ante el grupo y en eventos. Consérvalo
            a mano en partidos y encuentros.
          </p>
        </div>
      </div>
    </div>
  );
};
