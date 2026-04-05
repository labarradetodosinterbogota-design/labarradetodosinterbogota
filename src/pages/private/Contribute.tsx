import React, { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Input, TextArea, Spinner, Select } from '../../components/atoms';
import { DonationSection } from '../../components/molecules';
import { useAuth } from '../../context/AuthContext';
import {
  useSucceededContributions,
  useFinanceExpenses,
  useCreateFinanceExpense,
} from '../../hooks';
import { financeService, FINANCE_RECEIPTS_BUCKET } from '../../services/financeService';
import { supabase } from '../../services/supabaseClient';
import { formatCop } from '../../utils/formatCop';
import { sanitizeGalleryFileName } from '../../utils/sanitizeGalleryFileName';
import { BAR_OFFICIAL_NAME } from '../../constants/brand';
import type { ContributionTransparency, FinanceExpense } from '../../types';

function ExpenseReceiptButton({ storagePath }: Readonly<{ storagePath: string }>) {
  const [busy, setBusy] = useState(false);

  const openReceipt = () => {
    setBusy(true);
    financeService
      .getReceiptSignedUrl(storagePath)
      .then((url) => {
        if (url) {
          globalThis.open(url, '_blank', 'noopener,noreferrer');
        }
      })
      .catch(() => {})
      .finally(() => {
        setBusy(false);
      });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => {
        openReceipt();
      }}
      disabled={busy}
    >
      {busy ? '…' : 'Ver comprobante'}
    </Button>
  );
}

function donorLabel(
  row: Readonly<{ donor_public_name: string | null; user_id: string | null }>
): string {
  if (row.donor_public_name?.trim()) return row.donor_public_name.trim();
  if (row.user_id) return 'Integrante';
  return 'Anónimo';
}

function ContributionsTableBody({
  loading,
  contributions,
}: Readonly<{
  loading: boolean;
  contributions: ContributionTransparency[];
}>) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }
  if (contributions.length === 0) {
    return <p className="p-6 text-dark-500 text-sm">Aún no hay aportes acreditados registrados.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-dark-50 text-left text-dark-600">
        <tr>
          <th className="px-4 py-3 font-medium">Fecha</th>
          <th className="px-4 py-3 font-medium">Monto</th>
          <th className="px-4 py-3 font-medium">Donante</th>
          <th className="px-4 py-3 font-medium">Medio</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-dark-100">
        {contributions.map((c) => (
          <tr key={c.id} className="hover:bg-dark-50/50">
            <td className="px-4 py-3 text-dark-700">{new Date(c.created_at).toLocaleString('es-CO')}</td>
            <td className="px-4 py-3 font-medium text-dark-900">{formatCop(c.amount_cents)}</td>
            <td className="px-4 py-3 text-dark-700">{donorLabel(c)}</td>
            <td className="px-4 py-3 text-dark-600 capitalize">{c.provider}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExpensesTableBody({
  loading,
  expenses,
}: Readonly<{
  loading: boolean;
  expenses: FinanceExpense[];
}>) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }
  if (expenses.length === 0) {
    return <p className="p-6 text-dark-500 text-sm">No hay gastos registrados aún.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-dark-50 text-left text-dark-600">
        <tr>
          <th className="px-4 py-3 font-medium">Fecha</th>
          <th className="px-4 py-3 font-medium">Concepto</th>
          <th className="px-4 py-3 font-medium">Monto</th>
          <th className="px-4 py-3 font-medium">Aporte vinculado</th>
          <th className="px-4 py-3 font-medium">Comprobante</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-dark-100">
        {expenses.map((ex) => (
          <tr key={ex.id} className="hover:bg-dark-50/50">
            <td className="px-4 py-3 text-dark-700">{new Date(ex.expense_date).toLocaleDateString('es-CO')}</td>
            <td className="px-4 py-3">
              <p className="font-medium text-dark-900">{ex.title}</p>
              {ex.description && <p className="text-dark-500 text-xs mt-0.5">{ex.description}</p>}
            </td>
            <td className="px-4 py-3 font-medium text-dark-900">{formatCop(ex.amount_cents)}</td>
            <td className="px-4 py-3 text-dark-600 text-xs">
              {ex.related_contribution_id ? (
                <span className="font-mono">{ex.related_contribution_id.slice(0, 8)}…</span>
              ) : (
                '—'
              )}
            </td>
            <td className="px-4 py-3">
              {ex.receipt_storage_path ? (
                <ExpenseReceiptButton storagePath={ex.receipt_storage_path} />
              ) : (
                <span className="text-dark-400">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const Contribute: React.FC = () => {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'coordinator_admin';

  const thanks = params.get('thanks') === '1';
  const canceled = params.get('canceled') === '1';
  const pending = params.get('pending') === '1';

  const contributionsQ = useSucceededContributions();
  const expensesQ = useFinanceExpenses();
  const createExpense = useCreateFinanceExpense();

  const [expTitle, setExpTitle] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expRelatedId, setExpRelatedId] = useState('');
  const [expFile, setExpFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const contributions = contributionsQ.data ?? [];
  const expenses = expensesQ.data ?? [];

  const totalDonated = useMemo(
    () => contributions.reduce((acc, c) => acc + (c.amount_cents ?? 0), 0),
    [contributions]
  );
  const totalSpent = useMemo(
    () => expenses.reduce((acc, e) => acc + (e.amount_cents ?? 0), 0),
    [expenses]
  );

  const relatedOptions = useMemo(
    () =>
      contributions.slice(0, 80).map((c) => ({
        value: c.id,
        label: `${formatCop(c.amount_cents)} · ${new Date(c.created_at).toLocaleDateString('es-CO')}`,
      })),
    [contributions]
  );

  const handleAdminExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!user?.id) return;

    const amountCents = Number.parseInt(expAmount.replace(/\D/g, ''), 10);
    if (!expTitle.trim()) {
      setFormError('El concepto es obligatorio.');
      return;
    }
    if (!Number.isFinite(amountCents) || amountCents < 1) {
      setFormError('Indica un monto válido.');
      return;
    }

    try {
      const expense = await createExpense.mutateAsync({
        title: expTitle,
        description: expDesc.trim() || null,
        amountCents,
        expenseDate: expDate,
        relatedContributionId: expRelatedId || null,
        createdBy: user.id,
      });

      if (expFile) {
        const safe = sanitizeGalleryFileName(expFile.name) || 'comprobante.pdf';
        const path = `${expense.id}/${safe}`;
        const { error: upErr } = await supabase.storage.from(FINANCE_RECEIPTS_BUCKET).upload(path, expFile, {
          upsert: false,
          contentType: expFile.type || undefined,
        });
        if (upErr) throw upErr;
        await financeService.updateExpenseReceiptPath(expense.id, path);
        await queryClient.invalidateQueries({ queryKey: ['finance-expenses'] });
      }

      setExpTitle('');
      setExpDesc('');
      setExpAmount('');
      setExpRelatedId('');
      setExpFile(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo registrar el gasto.');
    }
  };

  const loading = contributionsQ.isLoading || expensesQ.isLoading;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Finanzas y transparencia</h1>
        <p className="text-dark-600 max-w-2xl">
          Donaciones procesadas con Mercado Pago y registro de gastos con comprobantes para {BAR_OFFICIAL_NAME}.
          Solo integrantes activos ven el detalle de aportes y ejecución presupuestal.
        </p>
      </div>

      {thanks && (
        <Alert type="success" message="Gracias. Si el pago fue aprobado, el aporte aparecerá en la tabla inferior." />
      )}
      {pending && <Alert type="warning" message="Pago pendiente. Mercado Pago notificará cuando se confirme." />}
      {canceled && <Alert type="warning" message="Pago cancelado. Puedes intentar de nuevo abajo." />}

      <DonationSection returnPath="/contribute" variant="page" showPrivateFinanceHint={false} />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-dark-200 bg-white p-5">
          <p className="text-sm text-dark-500 mb-1">Total donado (acreditado)</p>
          <p className="text-2xl font-bold text-dark-900">{formatCop(totalDonated)}</p>
        </div>
        <div className="rounded-xl border border-dark-200 bg-white p-5">
          <p className="text-sm text-dark-500 mb-1">Total gastos registrados</p>
          <p className="text-2xl font-bold text-dark-900">{formatCop(totalSpent)}</p>
        </div>
        <div className="rounded-xl border border-dark-200 bg-white p-5">
          <p className="text-sm text-dark-500 mb-1">Saldo referencial</p>
          <p className="text-2xl font-bold text-primary-600">{formatCop(totalDonated - totalSpent)}</p>
          <p className="text-xs text-dark-400 mt-1">Donaciones − gastos documentados</p>
        </div>
      </section>

      <section className="rounded-2xl border border-dark-200 bg-white overflow-hidden">
        <header className="px-6 py-4 border-b border-dark-100 bg-dark-900/5">
          <h2 className="text-xl font-semibold text-dark-900">Aportes acreditados</h2>
          <p className="text-sm text-dark-500">Incluye donaciones públicas e integrantes (Mercado Pago y Stripe).</p>
        </header>
        <div className="overflow-x-auto">
          <ContributionsTableBody loading={loading} contributions={contributions} />
        </div>
      </section>

      <section className="rounded-2xl border border-dark-200 bg-white overflow-hidden">
        <header className="px-6 py-4 border-b border-dark-100 bg-dark-900/5">
          <h2 className="text-xl font-semibold text-dark-900">Gastos e inversiones</h2>
          <p className="text-sm text-dark-500">
            Facturas y comprobantes cargados por coordinación. Enlaza un gasto a un aporte cuando aplique.
          </p>
        </header>
        <div className="overflow-x-auto">
          <ExpensesTableBody loading={loading} expenses={expenses} />
        </div>
      </section>

      {isAdmin && (
        <section className="rounded-2xl border border-primary-200 bg-primary-50/40 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-dark-900">Registrar gasto (coordinación)</h2>
          <p className="text-sm text-dark-600">
            Sube factura o comprobante (PDF o imagen, máx. 10 MB). Opcionalmente vincula el gasto a un aporte
            concreto.
          </p>
          {formError && <Alert type="error" message={formError} />}
          <form onSubmit={(e) => void handleAdminExpense(e)} className="space-y-4 max-w-xl">
            <Input
              label="Concepto"
              value={expTitle}
              onChange={(e) => setExpTitle(e.target.value)}
              required
              disabled={createExpense.isPending}
            />
            <TextArea
              label="Descripción (opcional)"
              rows={3}
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              disabled={createExpense.isPending}
            />
            <Input
              label="Monto (COP)"
              inputMode="numeric"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              required
              disabled={createExpense.isPending}
            />
            <Input
              label="Fecha del gasto"
              type="date"
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
              disabled={createExpense.isPending}
            />
            <Select
              label="Vincular a aporte (opcional)"
              placeholder="Sin vínculo"
              options={relatedOptions}
              value={expRelatedId}
              onChange={(e) => setExpRelatedId(e.target.value)}
              disabled={createExpense.isPending}
            />
            <div>
              <label htmlFor="receipt-file" className="block text-sm font-medium text-dark-900 mb-1">
                Comprobante / factura (opcional)
              </label>
              <input
                id="receipt-file"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="block w-full text-sm text-dark-600"
                disabled={createExpense.isPending}
                onChange={(e) => setExpFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="submit" variant="primary" disabled={createExpense.isPending}>
              {createExpense.isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" /> Guardando…
                </span>
              ) : (
                'Guardar gasto'
              )}
            </Button>
          </form>
        </section>
      )}

      <p className="text-sm text-dark-500">
        Donación pública:{' '}
        <Link to="/donaciones" className="text-primary-500 hover:text-primary-600 font-medium">
          página de donaciones
        </Link>
        .
      </p>
    </div>
  );
};
