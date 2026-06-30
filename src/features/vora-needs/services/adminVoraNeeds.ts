import type { VoraNeedStatus } from '@/features/vora-needs/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type AdminVoraNeedRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  visibility: string;
  urgency: string;
  status: string;
  region_id: string | null;
  city: string | null;
  is_featured: boolean;
  report_count: number;
  view_count: number;
  favorite_count: number;
  created_at: string;
  image_url: string | null;
  author_username: string;
  author_name: string | null;
};

export type AdminVoraNeedReportRow = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  need_id: string;
  need_title: string;
  need_status: string;
  reporter_username: string;
};

export async function fetchAdminVoraNeeds(status?: string | null): Promise<AdminVoraNeedRow[]> {
  const { data, error } = await supabase.rpc('get_admin_vora_needs', {
    p_status: status ?? null,
    p_limit: 80,
  });
  if (error || !data) return [];
  return data as AdminVoraNeedRow[];
}

export async function fetchAdminVoraNeedReports(): Promise<AdminVoraNeedReportRow[]> {
  const { data, error } = await supabase.rpc('admin_get_vora_need_reports', { p_limit: 50 });
  if (error || !data) return [];
  return data as AdminVoraNeedReportRow[];
}

export async function adminUpdateVoraNeedStatus(
  needId: string,
  status: VoraNeedStatus,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_update_vora_need_status', {
    p_need_id: needId,
    p_status: status,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function adminFeatureVoraNeed(
  needId: string,
  featured: boolean,
  days = 7,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_feature_vora_need', {
    p_need_id: needId,
    p_featured: featured,
    p_days: days,
  });
  return { error: supabaseErrorMessage(error) };
}
