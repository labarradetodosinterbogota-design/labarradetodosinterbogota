import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Input, Spinner } from '../../components/atoms';
import { startContributionCheckout } from '../../services/contributionsClient';

export const Contribute: React.FC = () => {
  const [params] = useSearchParams();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const thanks = params.get('thanks') === '1';
  const canceled = params.get('canceled') === '1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cop = Number.parseInt(amount.replace(/\D/g, ''), 10);
    if (!Number.isFinite(cop) || cop < 3000) {
      setError('Indica un monto válido (mínimo $3.000 COP).');
      return;
    }
    setLoading(true);
    try {
      const url = await startContributionCheckout(cop);
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar con el pago.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Auxilio / aporte</h1>
        <p className="text-dark-600">
          Contribución voluntaria para la barra. El pago se procesa de forma segura con Stripe.
        </p>
      </div>

      {thanks && (
        <Alert type="success" message="Gracias. Si completaste el pago, el registro se actualizará en breve." />
      )}
      {canceled && <Alert type="warning" message="Pago cancelado. Puedes intentar de nuevo cuando quieras." />}
      {error && <Alert type="error" message={error} />}

      <form onSubmit={handleSubmit} className="bg-white border border-dark-200 rounded-lg p-6 space-y-4">
        <Input
          id="amount"
          label="Monto (COP)"
          type="text"
          inputMode="numeric"
          placeholder="Ej: 50000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
          required
        />
        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size="sm" /> Redirigiendo…
            </span>
          ) : (
            'Ir a pagar con Stripe'
          )}
        </Button>
      </form>
    </div>
  );
};
