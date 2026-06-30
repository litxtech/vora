import { router } from 'expo-router';
import { getOrCreateDirectConversation } from '@/features/messaging/services/conversationData';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function openServiceChat(
  otherUserId: string,
  opts?: { requestId?: string; requesterId?: string; providerUserId?: string },
): Promise<{ error?: string }> {
  const { conversationId, error } = await getOrCreateDirectConversation(otherUserId);
  if (error || !conversationId) {
    return { error: error ?? 'Sohbet açılamadı' };
  }

  if (opts?.requestId && opts.requesterId && opts.providerUserId) {
    await supabase.from('vora_service_conversations').upsert(
      {
        request_id: opts.requestId,
        conversation_id: conversationId,
        requester_id: opts.requesterId,
        provider_user_id: opts.providerUserId,
      },
      { onConflict: 'request_id', ignoreDuplicates: true },
    );
  }

  router.push(`/chat/${conversationId}` as never);
  return {};
}

export async function resolveServiceChatPartner(
  requestId: string,
  currentUserId: string,
): Promise<{
  partnerUserId: string | null;
  requesterId?: string;
  providerUserId?: string;
  error?: string;
}> {
  const { data: request, error } = await supabase
    .from('vora_service_requests')
    .select('requester_id, accepted_provider_id, vora_service_providers!vora_service_requests_accepted_provider_id_fkey (user_id)')
    .eq('id', requestId)
    .maybeSingle();

  if (error) return { partnerUserId: null, error: supabaseErrorMessage(error) };
  if (!request) return { partnerUserId: null, error: 'Talep bulunamadı' };

  const provider = Array.isArray(request.vora_service_providers)
    ? request.vora_service_providers[0]
    : request.vora_service_providers;
  const providerUserId = provider?.user_id as string | undefined;

  if (request.requester_id === currentUserId) {
    return {
      partnerUserId: providerUserId ?? null,
      requesterId: request.requester_id,
      providerUserId: providerUserId ?? undefined,
    };
  }
  if (providerUserId === currentUserId) {
    return {
      partnerUserId: request.requester_id,
      requesterId: request.requester_id,
      providerUserId,
    };
  }
  return { partnerUserId: null, error: 'Bu işe erişiminiz yok' };
}
