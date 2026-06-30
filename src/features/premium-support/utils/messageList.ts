import type { PremiumSupportMessage } from '@/features/premium-support/types';

export function mergePremiumSupportMessages(
  fetched: PremiumSupportMessage[],
  current: PremiumSupportMessage[],
): PremiumSupportMessage[] {
  const byId = new Map<string, PremiumSupportMessage>();
  for (const message of current) byId.set(message.id, message);
  for (const message of fetched) byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export function buildPremiumSupportMessage(params: {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  messageType?: 'text' | 'image';
  mediaUrl?: string | null;
  isStaff?: boolean;
}): PremiumSupportMessage {
  return {
    id: params.id,
    thread_id: params.threadId,
    sender_id: params.senderId,
    content: params.content,
    message_type: params.messageType ?? 'text',
    media_url: params.mediaUrl ?? null,
    created_at: new Date().toISOString(),
    is_staff: params.isStaff ?? false,
  };
}
