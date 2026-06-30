import type { SendNotificationPayload } from '@/lib/notifications/types';
import { devWarn } from '@/lib/safeLog';
import { supabase } from '@/lib/supabase/client';

export async function sendNotification(payload: SendNotificationPayload): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: payload,
    });

    if (error) {
      devWarn('push', 'send-push-notification hatası', {
        eventType: payload.eventType,
        message: error.message,
      });
      return;
    }

    const body = data as { error?: string; skipped?: string } | null;
    if (body?.error) {
      devWarn('push', 'send-push-notification reddedildi', {
        eventType: payload.eventType,
        error: body.error,
      });
    }
  } catch (err) {
    devWarn('push', 'send-push-notification istisnası', {
      eventType: payload.eventType,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
