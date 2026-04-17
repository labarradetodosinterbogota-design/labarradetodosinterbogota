import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Button, Input, Alert, Spinner } from '../atoms';
import { startMercadoPagoDonation } from '../../services/donationsClient';
import { BAR_OFFICIAL_NAME } from '../../constants/brand';
import { trackAppEvent } from '../../utils/analytics';

const PRESETS = [20_000, 50_000, 100_000] as const;

function digitsOnly(value: string): string {
  return Array.from(value)
    .filter((ch) => ch >= '0' && ch <= '9')
    .join('');
}

export interface DonationSectionProps {
  /** Ruta para back_urls (ej. /donaciones o /contribute) */
  returnPath: string;
  /** Texto del bloque */
  variant?: 'home' | 'page';
  /** Centra título y formulario (útil para páginas públicas). */
  centerContent?: boolean;
  /** Enlace al módulo privado (ocultar si ya estás en Finanzas) */
  showPrivateFinanceHint?: boolean;
}

export const DonationSection: React.FC<DonationSectionProps> = ({
  returnPath,
  variant = 'page',
  centerContent = false,
  showPrivateFinanceHint = true,
}) => {
  const [amount, setAmount] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [donorPublicName, setDonorPublicName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHome = variant === 'home';
  const isCentered = isHome || centerContent;
  const sectionClass = 'rounded-2xl border border-dark-200 bg-white px-6 py-10 shadow-sm';
  const titleClass = isHome ? 'text-2xl sm:text-3xl' : 'text-3xl';
  const headerClass = isCentered
    ? 'flex flex-col items-center text-center gap-4 mb-6'
    : 'flex flex-col sm:flex-row sm:items-start gap-4 mb-6';
  const descriptionClass = isCentered
    ? 'text-dark-600 text-sm sm:text-base max-w-2xl mx-auto'
    : 'text-dark-600 text-sm sm:text-base max-w-2xl';
  const formClass = isCentered ? 'space-y-4 max-w-xl mx-auto' : 'space-y-4 max-w-xl';
  const presetsClass = isCentered ? 'flex flex-wrap justify-center gap-2' : 'flex flex-wrap gap-2';
  const buttonClass = isCentered ? 'w-full sm:w-auto min-w-[200px] mx-auto' : 'w-full sm:w-auto min-w-[200px]';
  const hintClass = isCentered ? 'text-xs text-dark-500 text-center' : 'text-xs text-dark-500';
  const origin = globalThis.window?.location?.origin ?? '';
  const baseUrl = origin ? `${origin}${returnPath}` : returnPath;

  const submit = async (cop: number) => {
    setError(null);
    setLoading(true);
    try {
      trackAppEvent('donation_checkout_start', {
        amount_cop: cop,
        return_path: returnPath,
      });
      const url = await startMercadoPagoDonation({
        amountCop: cop,
        successUrl: `${baseUrl}?thanks=1`,
        failureUrl: `${baseUrl}?canceled=1`,
        pendingUrl: `${baseUrl}?pending=1`,
        payerEmail: payerEmail.trim() || undefined,
        donorPublicName: donorPublicName.trim() || undefined,
      });
      globalThis.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar el pago.');
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cop = Number.parseInt(digitsOnly(amount), 10);
    if (!Number.isFinite(cop) || cop < 3_000) {
      setError('Indica un monto válido (mínimo $3.000 COP).');
      return;
    }
    void submit(cop);
  };

  return (
    <section className={sectionClass}>
      <div className={headerClass}>
        <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-500 flex items-center justify-center shrink-0">
          <Heart className="w-7 h-7" aria-hidden />
        </div>
        <div>
          <h2 className={`font-bold text-dark-900 mb-2 ${titleClass}`}>Donaciones</h2>
          <p className={descriptionClass}>
            Tu aporte ayuda a transporte, materiales y acciones de {BAR_OFFICIAL_NAME}. Es voluntario y seguro con
            Mercado Pago (tarjeta, PSE, efectivo y otros medios según tu país). Los pagos acreditados se reflejan en
            Finanzas del área privada para que todos vean el uso del dinero.
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} className="mb-4" />}

      <form onSubmit={handleSubmit} className={formClass}>
        <div className={presetsClass}>
          {PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              className="px-4 py-2 rounded-lg border border-dark-200 text-sm font-medium text-dark-800 hover:border-primary-400 hover:text-primary-600 transition-colors disabled:opacity-50"
              disabled={loading}
              onClick={() => {
                setAmount(String(v));
                void submit(v);
              }}
            >
              ${v.toLocaleString('es-CO')}
            </button>
          ))}
        </div>

        <Input
          id="donation-amount"
          label="Otro monto (COP)"
          type="text"
          inputMode="numeric"
          placeholder="Ej: 75000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
        />

        <Input
          id="donor-name"
          label="Nombre para transparencia (opcional)"
          type="text"
          placeholder="Ej: María G. o deja vacío para anónimo"
          value={donorPublicName}
          onChange={(e) => setDonorPublicName(e.target.value)}
          disabled={loading}
        />

        <Input
          id="payer-email"
          label="Correo (opcional, recomendado para comprobante)"
          type="email"
          placeholder="tu@correo.com"
          value={payerEmail}
          onChange={(e) => setPayerEmail(e.target.value)}
          disabled={loading}
        />

        <Button type="submit" variant="primary" className={buttonClass} disabled={loading}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size="sm" /> Conectando…
            </span>
          ) : (
            'Donar con Mercado Pago'
          )}
        </Button>

        {showPrivateFinanceHint ? (
          <p className={hintClass}>
            Al continuar serás redirigido al checkout de Mercado Pago. Si aún no ves el aporte, espera unos minutos
            o revisa desde{' '}
            <Link to="/contribute" className="text-primary-500 hover:text-primary-600 font-medium">
              Finanzas (área privada)
            </Link>
            .
          </p>
        ) : (
          <p className={hintClass}>
            Al continuar serás redirigido al checkout de Mercado Pago.
          </p>
        )}
      </form>
    </section>
  );
};
