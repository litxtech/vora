import type { SendNotificationPayload } from '@/lib/notifications/types';
import { supabase } from '@/lib/supabase/client';

export async function sendNotification(payload: SendNotificationPayload): Promise<void> {
  try {
    await supabase.functions.invoke('send-push-notification', {
      body: payload,
    });
  } catch {
    // Bildirim kritik akışı bloklamamalı
  }
}
