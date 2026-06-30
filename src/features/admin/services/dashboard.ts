import { supabase } from '@/lib/supabase/client';
import type { AdminDashboardStats } from '@/features/admin/types';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchDashboardStats(): Promise<{
  data: AdminDashboardStats | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats');

  if (error) return { data: null, error: supabaseErrorMessage(error)! };
  return { data: data as unknown as AdminDashboardStats, error: null };
}
