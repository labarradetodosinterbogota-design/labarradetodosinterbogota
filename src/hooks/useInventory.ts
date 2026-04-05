import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryService, type InventoryInput } from '../services/inventoryService';
import type { FlagInventory } from '../types';

const INVENTORY_QUERY_KEY = ['inventory-items'];

export const useInventoryItems = () => {
  return useQuery<FlagInventory[]>({
    queryKey: INVENTORY_QUERY_KEY,
    queryFn: () => inventoryService.listAll(),
  });
};

export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: InventoryInput) => inventoryService.create(item),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
    },
  });
};

export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InventoryInput> }) =>
      inventoryService.update(id, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
    },
  });
};

export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
    },
  });
};
