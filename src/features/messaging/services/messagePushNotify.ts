import type { NotificationEventType } from '@/constants/notifications';
import { sendNotification } from '@/lib/notifications/dispatch';
import { supabase } from '@/lib/supabase/client';
import type { MessageType } from '../types';
import { messagePreviewFromRow } from '../utils/inboxUpdates';

type NotifyMessagePushParams = {
  conversationId: string;
  messageId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
};

type ConversationMemberRow = {
  user_id: string;
  muted_until: string | null;
  profile: { messaging_prefs: Record<string, unknown> | null } | null;
};

function buildPushCopy(
  params: NotifyMessagePushParams,
  isGroup: boolean,
  groupTitle: string | null,
  senderName: string,
  hidePreview: boolean,
): { title: string; body: string; eventType: NotificationEventType } {
  const preview = messagePreviewFromRow({
    conversation_id: params.conversationId,
    sender_id: params.senderId,
    content: params.content,
    message_type: params.messageType,
    created_at: new Date().toISOString(),
  });

  const eventType: NotificationEventType = isGroup ? 'group_message' : 'message';
  const title = isGroup ? groupTitle?.trim() || 'Grup mesajı' : senderName;

  if (hidePreview) {
    return { title, body: 'Yeni mesaj', eventType };
  }

  const body = isGroup ? `${senderName}: ${preview}` : preview;
  return { title, body, eventType };
}

async function dispatchMessagePush(params: NotifyMessagePushParams): Promise<void> {
  if (params.messageType === 'call') return;

  const [{ data: conversation }, { data: sender }, { data: members }] = await Promise.all([
    supabase.from('conversations').select('type, title').eq('id', params.conversationId).maybeSingle(),
    supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', params.senderId)
      .maybeSingle(),
    supabase
      .from('conversation_members')
      .select('user_id, muted_until, profile:profiles(messaging_prefs)')
      .eq('conversation_id', params.conversationId)
      .neq('user_id', params.senderId),
  ]);

  const isGroup = conversation?.type === 'group';
  const senderName =
    sender?.full_name?.trim() ||
    (sender?.username ? `@${sender.username}` : null) ||
    'Birisi';
  const now = Date.now();

  const recipients = ((members ?? []) as ConversationMemberRow[]).filter((member) => {
    if (!member.user_id || member.user_id === params.senderId) return false;
    if (member.muted_until && new Date(member.muted_until).getTime() > now) return false;
    return true;
  });

  if (recipients.length === 0) return;

  await Promise.all(
    recipients.map(async (member) => {
      const hidePreview =
        member.profile?.messaging_prefs?.hide_notification_preview === true;
      const { title, body, eventType } = buildPushCopy(
        params,
        isGroup,
        conversation?.title ?? null,
        senderName,
        hidePreview,
      );

      await sendNotification({
        recipientId: member.user_id,
        eventType,
        title,
        body,
        actorId: params.senderId,
        pushOnly: true,
        data: {
          conversation_id: params.conversationId,
          conversationId: params.conversationId,
          message_id: params.messageId,
          messageId: params.messageId,
          is_group: isGroup,
          sender_name: senderName,
          actor_avatar_url: sender?.avatar_url ?? undefined,
        },
      });
    }),
  );
}

/** Karşı tarafa push ilet (outbox gecikirse veya ulaşmazsa yedek). */
export function notifyMessageRecipientsPush(params: NotifyMessagePushParams): void {
  void dispatchMessagePush(params).catch(() => undefined);
}
