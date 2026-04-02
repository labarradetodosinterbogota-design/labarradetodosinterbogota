-- Aportes / auxilios vía Stripe (webhook escribe con service role; RLS solo lectura propia)

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'cop',
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contributions_user_id_idx on public.contributions (user_id);
create index if not exists contributions_status_idx on public.contributions (status);
create index if not exists contributions_stripe_pi_idx on public.contributions (stripe_payment_intent_id);

alter table public.contributions enable row level security;

create policy "contributions_select_own"
  on public.contributions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Sin políticas INSERT/UPDATE/DELETE para authenticated: solo service_role (webhook / jobs)
