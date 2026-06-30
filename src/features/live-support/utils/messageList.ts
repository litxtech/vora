import type { LiveSupportMessage, LiveSupportMessageType } from '@/features/live-support/types';

export function mapLiveSupportMessageType(value?: string | null): LiveSupportMessageType {
  if (value === 'image') return 'image';
  if (value === 'video') return 'video';
  return 'text';
}

export function mergeLiveSupportMessages(
  fetched: LiveSupportMessage[],
  current: LiveSupportMessage[],
): LiveSupportMessage[] {
  const byId = new Map<string, LiveSupportMessage>();
  for (const message of current) byId.set(message.id, message);
  for (const message of fetched) byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export function buildLiveSupportMessage(params: {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  messageType?: LiveSupportMessageType;
  mediaUrl?: string | null;
  isStaff?: boolean;
}): LiveSupportMessage {
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
