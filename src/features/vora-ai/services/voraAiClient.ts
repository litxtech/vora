import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage, toUserFacingError } from '@/lib/errors';
import type { VoraAiInvokePayload, VoraAiResponse } from '@/features/vora-ai/types';

export async function invokeVoraAi(payload: VoraAiInvokePayload): Promise<VoraAiResponse> {
  const { data, error } = await supabase.functions.invoke('vora-ai', { body: payload });

  if (error) {
    throw new Error(supabaseErrorMessage(error) ?? 'Vora AI şu an yanıt veremiyor.');
  }

  const result = data as VoraAiResponse | { error?: string };
  if (result && 'error' in result && result.error) {
    throw new Error(toUserFacingError(result.error, { fallback: 'Vora AI şu an yanıt veremiyor.' }));
  }

  return result as VoraAiResponse;
}
