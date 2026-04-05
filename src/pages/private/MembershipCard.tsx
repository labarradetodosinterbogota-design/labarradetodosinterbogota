import React, { useState } from 'react';
import { Button, Alert, BrandMark } from '../../components/atoms';
import { Download, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import { BAR_OFFICIAL_NAME } from '../../constants/brand';

async function getBrandLogoDataUrl(): Promise<string | null> {
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo cargar el logo.'));
      img.src = '/favicon.svg';
    });

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

export const MembershipCard: React.FC = () => {
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
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
          <div className="bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 rounded-xl p-8 text-white shadow-2xl max-w-md mx-auto">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="font-bold text-amber-300">{BAR_OFFICIAL_NAME}</h3>
                <p className="text-sm text-dark-100">Carné de integrante</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <BrandMark variant="onDark" />
                <div className="rounded-md bg-black px-2 py-1 text-xs font-bold tracking-wider text-white">
                  {initials}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-amber-300 bg-amber-400 p-4 mb-6 space-y-3">
              <div className="rounded-md bg-black px-3 py-2">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-white/70">Nombre</p>
                <p className="text-base font-bold text-white">{user.full_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-black px-3 py-2">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-white/70">Carné</p>
                  <p className="font-mono font-bold text-white">{user.member_id}</p>
                </div>
                <div className="rounded-md bg-black px-3 py-2">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-white/70">Integrante desde</p>
                  <p className="font-bold text-white">{new Date(user.join_date).getFullYear()}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-amber-300 bg-amber-400 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-dark-900">
                Código QR de verificación
              </p>
              <div className="rounded-md bg-black p-3">
                <div className="flex h-28 w-full items-center justify-center rounded border border-white/20 bg-black px-2">
                  <div className="rounded-md bg-white p-2 shadow-sm">
                    <QRCodeSVG value={qrValue} size={96} bgColor="#ffffff" fgColor="#000000" level="M" />
                  </div>
                </div>
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
            disabled={isSharing}
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            type="button"
            onClick={() => {
              void handleShareCard();
            }}
            isLoading={isSharing}
            disabled={isDownloading}
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
