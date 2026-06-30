import { supabase } from '@/lib/supabase/client';

export type ReferralTrackEventType = 'share' | 'interaction' | 'active_minute';

export async function trackReferralEvent(eventType: ReferralTrackEventType): Promise<void> {
  const { error } = await supabase.rpc('referral_track_event', { p_event_type: eventType });
  if (error) {
    console.warn('[referral] track event failed:', eventType, error.message);
  }
}
