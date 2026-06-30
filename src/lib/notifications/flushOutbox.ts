import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type FlushResult = {
  processed: number;
  error: string | null;
};

/** Admin gönderimlerinden sonra bekleyen push kuyruğunu edge function ile işler. */
export async function flushNotificationOutbox(batchSize = 100): Promise<FlushResult> {
  const { data, error } = await supabase.functions.invoke('process-notification-outbox', {
    body: { batch_size: batchSize },
  });

  if (error) {
    return { processed: 0, error: supabaseErrorMessage(error)! };
  }

  const payload = data as { processed?: number; error?: string } | null;
  if (payload?.error) {
    return { processed: 0, error: payload.error };
  }

  return { processed: payload?.processed ?? 0, error: null };
}
