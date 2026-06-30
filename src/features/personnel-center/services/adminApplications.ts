import { supabase } from '@/lib/supabase/client';
import type { JobApplicationStatus } from '@/features/personnel-center/types';
import { supabaseErrorMessage } from '@/lib/errors';

export type AdminJobApplicationRow = {
  id: string;
  status: JobApplicationStatus;
  message: string | null;
  created_at: string;
  applicant_id: string;
  applicant_username: string;
  employer_id: string;
  employer_username: string;
  listing_title: string;
  listing_type: string;
};

const STATUS_LABELS: Record<JobApplicationStatus, string> = {
  sent: 'Gönderildi',
  reviewing: 'İnceleniyor',
  interview: 'Görüşme',
  accepted: 'Kabul',
  rejected: 'Red',
};

export function jobApplicationStatusLabel(status: JobApplicationStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export async function fetchAdminJobApplications(
  status?: JobApplicationStatus | null,
  limit = 50,
): Promise<AdminJobApplicationRow[]> {
  const { data, error } = await supabase.rpc('admin_list_job_applications', {
    p_status: status ?? null,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as AdminJobApplicationRow[];
}

export async function removeAdminJobApplication(
  applicationId: string,
  reason?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_remove_job_application', {
    p_application_id: applicationId,
    p_reason: reason ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}
