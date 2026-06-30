import type { PushPrefId } from '@/constants/notifications';
import type { QuietHoursSettings, RegionalAlertSubscription } from '@/lib/notifications/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchNotificationSettings(userId: string): Promise<{
  prefs: Partial<Record<PushPrefId, boolean>>;
  quietHours: QuietHoursSettings;
  regional: RegionalAlertSubscription | null;
}> {
  const [{ data: profile }, { data: regional }] = await Promise.all([
    supabase
      .from('profiles')
      .select('notification_prefs, quiet_hours')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('regional_alert_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const rawPrefs = (profile?.notification_prefs ?? {}) as Partial<Record<PushPrefId, boolean>>;
  const rawQuiet = (profile?.quiet_hours ?? {}) as Partial<QuietHoursSettings>;

  return {
    prefs: rawPrefs,
    quietHours: {
      enabled: rawQuiet.enabled ?? false,
      start: rawQuiet.start ?? '22:00',
      end: rawQuiet.end ?? '08:00',
      timezone: rawQuiet.timezone ?? 'Europe/Istanbul',
    },
    regional: regional
      ? {
          regionId: regional.region_id,
          districts: regional.districts ?? [],
          neighborhoods: regional.neighborhoods ?? [],
          notifyEmergency: regional.notify_emergency,
          notifyIncidents: regional.notify_incidents,
          notifyEvents: regional.notify_events,
          notifyJobs: regional.notify_jobs,
        }
      : null,
  };
}

export async function updateNotificationPrefs(
  userId: string,
  prefs: Partial<Record<PushPrefId, boolean>>,
): Promise<{ error: string | null }> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('notification_prefs')
    .eq('id', userId)
    .maybeSingle();

  const merged = {
    ...((existing?.notification_prefs ?? {}) as Record<string, boolean>),
    ...prefs,
  };

  const { error } = await supabase
    .from('profiles')
    .update({ notification_prefs: merged, updated_at: new Date().toISOString() })
    .eq('id', userId);

  return { error: supabaseErrorMessage(error) };
}

export async function updateQuietHours(
  userId: string,
  quietHours: QuietHoursSettings,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ quiet_hours: quietHours, updated_at: new Date().toISOString() })
    .eq('id', userId);

  return { error: supabaseErrorMessage(error) };
}

export async function updateRegionalSubscription(
  userId: string,
  regionId: string,
  updates: Partial<RegionalAlertSubscription>,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('regional_alert_subscriptions')
    .upsert(
      {
        user_id: userId,
        region_id: regionId,
        districts: updates.districts ?? [],
        neighborhoods: updates.neighborhoods ?? [],
        notify_emergency: updates.notifyEmergency ?? true,
        notify_incidents: updates.notifyIncidents ?? true,
        notify_events: updates.notifyEvents ?? true,
        notify_jobs: updates.notifyJobs ?? true,
      },
      { onConflict: 'user_id,region_id' },
    );

  return { error: supabaseErrorMessage(error) };
}
