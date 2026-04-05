import React, { useState } from 'react';
import { Button, Alert } from '../../components/atoms';
import { Download, Share2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BAR_OFFICIAL_NAME } from '../../constants/brand';

export const MembershipCard: React.FC = () => {
  const { user } = useAuth();
  const [showPdfNotice, setShowPdfNotice] = useState(false);

  if (!user) return null;

  const handleDownloadPDF = () => {
    setShowPdfNotice(true);
  };

  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-dark-200 p-6">
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Carné digital de integrante</h1>
        <p className="text-dark-600">
          Comprobante de membresía para acceso y eventos del grupo
        </p>
      </div>

      {showPdfNotice && (
        <Alert
          type="info"
          title="Descarga en PDF (próximamente)"
          message="Podrás generar un PDF descargable de tu carné."
          onClose={() => setShowPdfNotice(false)}
        />
      )}

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
        <Button variant="primary" className="w-full" onClick={handleDownloadPDF}>
          <Download className="w-4 h-4 mr-2" />
          Descargar PDF
        </Button>
        <Button variant="secondary" className="w-full" type="button">
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
  );
};
