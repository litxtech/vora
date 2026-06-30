import { supabase } from '@/lib/supabase/client';

export type PersonnelCenterStats = {
  employerCount: number;
  jobOwnerCount: number;
  businessesWithHires: number;
  activeJobs: number;
  successfulHires: number;
  totalApplications: number;
};

const EMPTY_STATS: PersonnelCenterStats = {
  employerCount: 0,
  jobOwnerCount: 0,
  businessesWithHires: 0,
  activeJobs: 0,
  successfulHires: 0,
  totalApplications: 0,
};

export async function fetchPersonnelCenterStats(
  regionId?: string | null,
): Promise<PersonnelCenterStats> {
  const { data, error } = await supabase.rpc('get_personnel_center_stats', {
    p_region_id: regionId ?? null,
  });

  if (error || !data || typeof data !== 'object') {
    return EMPTY_STATS;
  }

  const row = data as Record<string, unknown>;
  return {
    employerCount: Number(row.employer_count ?? 0),
    jobOwnerCount: Number(row.job_owner_count ?? row.employer_count ?? 0),
    businessesWithHires: Number(row.businesses_with_hires ?? 0),
    activeJobs: Number(row.active_jobs ?? 0),
    successfulHires: Number(row.successful_hires ?? 0),
    totalApplications: Number(row.total_applications ?? 0),
  };
}
