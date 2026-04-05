import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '../services/financeService';
import type { ContributionTransparency, FinanceExpense } from '../types';

export const useSucceededContributions = () => {
  return useQuery<ContributionTransparency[]>({
    queryKey: ['finance-contributions'],
    queryFn: () => financeService.listSucceededContributions(),
  });
};

export const useFinanceExpenses = () => {
  return useQuery<FinanceExpense[]>({
    queryKey: ['finance-expenses'],
    queryFn: () => financeService.listFinanceExpenses(),
  });
};

export const useCreateFinanceExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeService.createFinanceExpense,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['finance-expenses'] });
    },
  });
};
