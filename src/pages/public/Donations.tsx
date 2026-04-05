import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { DonationSection } from '../../components/molecules';
import { Alert } from '../../components/atoms';

export const Donations: React.FC = () => {
  const [params] = useSearchParams();
  const thanks = params.get('thanks') === '1';
  const canceled = params.get('canceled') === '1';
  const pending = params.get('pending') === '1';

  return (
    <div className="space-y-8">
      {thanks && (
        <Alert
          type="success"
          message="Gracias por tu donación. Si el pago fue aprobado, aparecerá en el módulo de finanzas del área privada en breve."
        />
      )}
      {pending && (
        <Alert
          type="warning"
          message="Pago pendiente de confirmación. Cuando Mercado Pago lo acredite, verás el aporte en finanzas."
        />
      )}
      {canceled && <Alert type="warning" message="Cancelaste el proceso de pago. Puedes intentar de nuevo cuando quieras." />}

      <DonationSection returnPath="/donaciones" variant="page" centerContent />

      <p className="text-center text-sm text-dark-500">
        <Link to="/" className="text-primary-500 hover:text-primary-600 font-medium">
          ← Volver al inicio
        </Link>
      </p>
    </div>
  );
};
