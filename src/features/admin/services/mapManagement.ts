import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { notifyMapMarkerRemovedBySource } from '@/features/map/services/mapMarkerSync';

export async function fetchAdminIncidents(status?: string | null, limit = 50) {
  let query = supabase
    .from('incident_reports')
    .select('id, title, description, severity, status, region_id, latitude, longitude, created_at, reporter_id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  return { data: data ?? [], error: supabaseErrorMessage(error) };
}

export async function updateIncident(
  id: string,
  updates: {
    title?: string;
    description?: string;
    status?: 'open' | 'verified' | 'resolved' | 'dismissed';
    severity?: 'low' | 'medium' | 'high' | 'critical';
  },
) {
  const { error } = await supabase.from('incident_reports').update(updates).eq('id', id);
  return { error: supabaseErrorMessage(error) };
}

export async function removeIncident(id: string, moderatorId: string) {
  const { error: updateError } = await supabase
    .from('incident_reports')
    .update({ status: 'dismissed' })
    .eq('id', id);

  if (updateError) return { error: updateError.message };

  notifyMapMarkerRemovedBySource('incidents', id);

  const { error } = await supabase.from('moderation_actions').insert({
    moderator_id: moderatorId,
    target_type: 'incident',
    target_id: id,
    action: 'remove',
    reason: 'Admin tarafından kaldırıldı',
  });

  return { error: supabaseErrorMessage(error) };
}
