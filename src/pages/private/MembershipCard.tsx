import React, { useState } from 'react';
import { Button, Alert } from '../../components/atoms';
import { Download, Share2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BAR_OFFICIAL_NAME } from '../../constants/brand';

export const MembershipCard: React.FC = () => {
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  if (!user) return null;

  const handleDownloadPDF = async () => {
    setFeedback(null);
    setIsDownloading(true);
    try {
      const { default: JsPdf } = await import('jspdf');
      const joinYear = new Date(user.join_date).getFullYear();
      const issuedAt = new Date().toLocaleDateString('es-CO');
      const doc = new JsPdf({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFillColor(20, 22, 30);
      doc.rect(15, 20, 180, 70, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.text(BAR_OFFICIAL_NAME, 22, 32);
      doc.setFontSize(11);
      doc.text('Carné digital de integrante', 22, 39);

      doc.setFontSize(10);
      doc.text(`Nombre: ${user.full_name}`, 22, 52);
      doc.text(`Carné: ${user.member_id}`, 22, 59);
      doc.text(`Integrante desde: ${joinYear}`, 22, 66);
      doc.text(`Emitido: ${issuedAt}`, 22, 73);

      doc.setDrawColor(220, 225, 235);
      doc.rect(15, 100, 180, 80);
      doc.setTextColor(28, 33, 43);
      doc.setFontSize(13);
      doc.text('Comprobante de membresía', 22, 114);
      doc.setFontSize(10);
      doc.text(
        'Este documento acredita tu membresía dentro de Barra Popular Legión Bacatá Inter Bogotá.',
        22,
        124
      );
      doc.text(
        'Presenta este carné en accesos y eventos oficiales del grupo cuando se requiera.',
        22,
        131
      );

      doc.setFontSize(9);
      doc.setTextColor(90, 100, 120);
      doc.text(`ID de verificación: ${user.id}`, 22, 167);

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
      const joinYear = new Date(user.join_date).getFullYear();
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

  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

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
                <h3 className="font-bold text-primary-400">{BAR_OFFICIAL_NAME}</h3>
                <p className="text-sm text-dark-200">Carné de integrante</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary-400 text-dark-900 flex items-center justify-center font-bold text-lg">
                {initials}
              </div>
            </div>

            <div className="border-t border-dark-700 pt-6 pb-6 mb-6 space-y-4">
              <div>
                <p className="text-xs text-dark-300 mb-1">Nombre</p>
                <p className="font-bold text-lg">{user.full_name}</p>
              </div>
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-dark-300 mb-1">Carné</p>
                  <p className="font-mono font-bold">{user.member_id}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-300 mb-1">Integrante desde</p>
                  <p className="font-bold">{new Date(user.join_date).getFullYear()}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-dark-700 pt-6">
              <p className="text-xs text-dark-300 mb-2">Código QR de verificación</p>
              <div className="bg-white p-4 rounded">
                <div className="w-full h-32 bg-dark-100 rounded flex items-center justify-center text-dark-500 text-xs">
                  Código QR próximamente
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
