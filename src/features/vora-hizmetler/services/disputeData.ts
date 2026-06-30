import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function openServiceDispute(
  requestId: string,
  reason: string,
): Promise<{ paymentId?: string; error?: string }> {
  const { data, error } = await supabase.rpc('vora_requester_open_dispute', {
    p_request_id: requestId,
    p_reason: reason.trim(),
  });

  if (error) return { error: supabaseErrorMessage(error) };
  const result = data as { ok?: boolean; error?: string; payment_id?: string } | null;
  if (result?.error) return { error: result.error };
  if (!result?.ok) return { error: 'İtiraz açılamadı' };
  return { paymentId: result.payment_id };
}
