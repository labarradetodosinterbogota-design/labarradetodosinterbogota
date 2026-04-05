import { supabase } from './supabaseClient';
import type { ContributionTransparency, FinanceExpense } from '../types';

const CONTRIBUTIONS_COLUMNS =
  'id, user_id, amount_cents, currency, status, provider, donor_public_name, created_at';

export const FINANCE_RECEIPTS_BUCKET = 'finance-receipts';

export const financeService = {
  async listSucceededContributions(limit = 150): Promise<ContributionTransparency[]> {
    const { data, error } = await supabase
      .from('contributions')
      .select(CONTRIBUTIONS_COLUMNS)
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as ContributionTransparency[];
  },

  async listFinanceExpenses(): Promise<FinanceExpense[]> {
    const { data, error } = await supabase
      .from('finance_expenses')
      .select('*')
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return (data ?? []) as FinanceExpense[];
  },

  async createFinanceExpense(input: Readonly<{
    title: string;
    description: string | null;
    amountCents: number;
    expenseDate: string;
    relatedContributionId: string | null;
    createdBy: string;
  }>): Promise<FinanceExpense> {
    const { data, error } = await supabase
      .from('finance_expenses')
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        amount_cents: input.amountCents,
        expense_date: input.expenseDate,
        related_contribution_id: input.relatedContributionId,
        created_by: input.createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data as FinanceExpense;
  },

  async updateExpenseReceiptPath(expenseId: string, receiptStoragePath: string): Promise<void> {
    const { error } = await supabase
      .from('finance_expenses')
      .update({ receipt_storage_path: receiptStoragePath, updated_at: new Date().toISOString() })
      .eq('id', expenseId);

    if (error) throw error;
  },

  async getReceiptSignedUrl(storagePath: string, expiresInSeconds = 600): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(FINANCE_RECEIPTS_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  },
};
