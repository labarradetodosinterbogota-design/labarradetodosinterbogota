/*
  Finanzas / donaciones:
  - contributions: soporte Mercado Pago (Checkout Pro) además de Stripe.
  - donor_public_name / payer_email para transparencia y donantes anónimos públicos.
  - finance_expenses: gastos documentados por admins (facturas / comprobantes).
  - RLS: integrantes activos ven aportes exitosos y gastos; admins gestionan gastos y Storage.
*/

ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'stripe';

ALTER TABLE public.contributions DROP CONSTRAINT IF EXISTS contributions_provider_check;
ALTER TABLE public.contributions
  ADD CONSTRAINT contributions_provider_check CHECK (provider IN ('stripe', 'mercadopago'));

ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS mercadopago_preference_id text;

ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS mercadopago_payment_id text;

ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS payer_email text;

ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS donor_public_name text;

CREATE UNIQUE INDEX IF NOT EXISTS contributions_mercadopago_payment_id_key
  ON public.contributions (mercadopago_payment_id)
  WHERE mercadopago_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS contributions_mercadopago_preference_idx
  ON public.contributions (mercadopago_preference_id);

CREATE INDEX IF NOT EXISTS contributions_provider_idx ON public.contributions (provider);

COMMENT ON COLUMN public.contributions.provider IS 'Pasarela: stripe | mercadopago';
COMMENT ON COLUMN public.contributions.donor_public_name IS 'Nombre opcional mostrado en transparencia (ej. inicial o Anónimo).';

CREATE TABLE IF NOT EXISTS public.finance_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  related_contribution_id uuid REFERENCES public.contributions (id) ON DELETE SET NULL,
  receipt_storage_path text,
  created_by uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_expenses_expense_date_idx ON public.finance_expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS finance_expenses_created_by_idx ON public.finance_expenses (created_by);

ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_expenses_select_active_members" ON public.finance_expenses;
CREATE POLICY "finance_expenses_select_active_members"
  ON public.finance_expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users AS u
      WHERE u.id = auth.uid() AND u.status = 'active'
    )
  );

DROP POLICY IF EXISTS "finance_expenses_admin_all" ON public.finance_expenses;
CREATE POLICY "finance_expenses_admin_all"
  ON public.finance_expenses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

DROP POLICY IF EXISTS "contributions_select_succeeded_transparency" ON public.contributions;
CREATE POLICY "contributions_select_succeeded_transparency"
  ON public.contributions FOR SELECT
  TO authenticated
  USING (
    status = 'succeeded'
    AND EXISTS (
      SELECT 1 FROM public.users AS u
      WHERE u.id = auth.uid() AND u.status = 'active'
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'finance-receipts',
  'finance-receipts',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Finance receipts insert admin" ON storage.objects;
DROP POLICY IF EXISTS "Finance receipts read active or admin" ON storage.objects;
DROP POLICY IF EXISTS "Finance receipts delete admin" ON storage.objects;

CREATE POLICY "Finance receipts insert admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'finance-receipts'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

CREATE POLICY "Finance receipts read active or admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'finance-receipts'
    AND (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
      )
    )
  );

CREATE POLICY "Finance receipts delete admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'finance-receipts'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );
