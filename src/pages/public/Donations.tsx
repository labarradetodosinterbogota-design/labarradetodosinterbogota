import React from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { DonationSection, DonationThanksCard } from '../../components/molecules';
import { Alert } from '../../components/atoms';
import { trackAppEventOnce } from '../../utils/analytics';

export const Donations: React.FC = () => {
  const [params] = useSearchParams();
  const location = useLocation();
  const thanks = params.get('thanks') === '1';
  const canceled = params.get('canceled') === '1';
  const pending = params.get('pending') === '1';

  React.useEffect(() => {
    if (thanks) {
      trackAppEventOnce(`donation_thanks:${location.pathname}${location.search}`, 'donation_return_thanks', {
        surface: 'public_donaciones',
        payment_flow: 'mercadopago',
      });
    }
  }, [thanks, location.pathname, location.search]);

  React.useEffect(() => {
    if (pending) {
      trackAppEventOnce(`donation_pending:${location.pathname}`, 'donation_return_pending', {
        surface: 'public_donaciones',
      });
    }
  }, [pending, location.pathname]);

  React.useEffect(() => {
    if (canceled) {
      trackAppEventOnce(`donation_canceled:${location.pathname}`, 'donation_return_canceled', {
        surface: 'public_donaciones',
      });
    }
  }, [canceled, location.pathname]);

  return (
    <div className="space-y-8">
      {thanks && <DonationThanksCard variant="public_donations" />}
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
