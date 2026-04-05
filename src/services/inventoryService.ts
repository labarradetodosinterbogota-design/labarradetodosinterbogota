import { supabase } from './supabaseClient';
import type { ConditionStatus, FlagInventory, InventoryType } from '../types';

export interface InventoryInput {
  name: string;
  type: InventoryType;
  photo_url?: string | null;
  dimensions?: string | null;
  manufacturer?: string | null;
  condition?: ConditionStatus;
  owner?: string | null;
  acquisition_date?: string | null;
}

export const inventoryService = {
  async listAll(): Promise<FlagInventory[]> {
    const { data, error } = await supabase
      .from('flags_instruments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as FlagInventory[];
  },

  async create(item: InventoryInput): Promise<FlagInventory> {
    const payload = {
      name: item.name.trim(),
      type: item.type,
      condition: item.condition ?? 'good',
      photo_url: item.photo_url?.trim() || null,
      dimensions: item.dimensions?.trim() || null,
      manufacturer: item.manufacturer?.trim() || null,
      owner: item.owner || null,
      acquisition_date: item.acquisition_date || null,
    };

    const { data, error } = await supabase
      .from('flags_instruments')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as FlagInventory;
  },

  async update(id: string, updates: Partial<InventoryInput>): Promise<FlagInventory> {
    const payload: Partial<InventoryInput> = {
      ...updates,
      name: typeof updates.name === 'string' ? updates.name.trim() : updates.name,
      photo_url: typeof updates.photo_url === 'string' ? updates.photo_url.trim() : updates.photo_url,
      dimensions: typeof updates.dimensions === 'string' ? updates.dimensions.trim() : updates.dimensions,
      manufacturer:
        typeof updates.manufacturer === 'string' ? updates.manufacturer.trim() : updates.manufacturer,
    };

    const { data, error } = await supabase
      .from('flags_instruments')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as FlagInventory;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('flags_instruments').delete().eq('id', id);
    if (error) throw error;
  },
};
