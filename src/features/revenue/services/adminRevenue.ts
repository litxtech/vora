import { supabase } from '@/lib/supabase/client';

export type RevenueRecordRow = {
  id: string;
  revenue_type: string;
  amount: number;
  currency: string;
  reference_label: string | null;
  recorded_at: string;
};

export async function fetchRevenueRecords(limit = 50, type?: string | null): Promise<RevenueRecordRow[]> {
  const { data, error } = await supabase.rpc('admin_list_revenue_records', {
    p_limit: limit,
    p_type: type ?? null,
  });
  if (error || !data) return [];
  return data as RevenueRecordRow[];
}
