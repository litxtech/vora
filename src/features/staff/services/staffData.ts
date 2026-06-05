import { supabase } from '@/lib/supabase/client';

export async function fetchStaffRequest(id: string) {
  const { data } = await supabase
    .from('staff_requests')
    .select('id, title, description, positions, salary_range, location_label, district, latitude, longitude, created_at')
    .eq('id', id)
    .maybeSingle();
  return data;
}
