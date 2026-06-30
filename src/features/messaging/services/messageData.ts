import { markConversationNotificationsRead } from '@/features/notifications/services/notificationData';
import { refreshMessagingUnreadFromServer } from './messagingUnreadRefresh';
import { notifyMessageRecipientsPush } from './messagePushNotify';
import {
  sanitizeAvatarUrl,
  sanitizeDisplayName,
} from '@/features/account-deletion/utils';
import { alertBlockError, isBlockedByUserError } from '@/features/moderation/utils/blockErrors';
import { supabase } from '@/lib/supabase/client';
import { useMessagingStore } from '../store/messagingStore';
import type { ChatMessage, MessageDeliveryStatus, MessageType } from '../types';
import { supabaseErrorMessage } from '@/lib/errors';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MESSAGE_SELECT = `
  id, conversation_id, sender_id, content, media_url, message_type, metadata,
  reply_to_id, forwarded_from_id, edited_at, deleted_for_all, is_read, created_at,
  sender:sender_id (id, username, full_name, avatar_url, account_status),
  reply_to:reply_to_id (
    id, content, sender_id, message_type,
    sender:sender_id (id, username, full_name, avatar_url, account_status)
  ),
  forwarded_from:forwarded_from_id (
    id, content, sender_id, message_type,
    sender:sender_id (id, username, full_name, avatar_url, account_status)
  )
`;

type DbMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  message_type: MessageType;
  metadata: Record<string, unknown> | null;
  reply_to_id: string | null;
  forwarded_from_id: string | null;
  edited_at: string | null;
  deleted_for_all: boolean;
  is_read: boolean;
  created_at: string;
  sender?: ChatMessage['sender'];
  reply_to?: ChatMessage['replyTo'];
  forwarded_from?: ChatMessage['forwardedFrom'];
};

function isValidUuid(id: string | null | undefined): id is string {
  return !!id && UUID_RE.test(id);
}

function deliveryStatus(
  message: DbMessage,
  currentUserId: string,
  otherLastReadAt: string | null,
): MessageDeliveryStatus {
  return resolveOutgoingDeliveryStatus(
    message.created_at,
    currentUserId,
    message.sender_id,
    otherLastReadAt,
  );
}

export function resolveOutgoingDeliveryStatus(
  createdAt: string,
  currentUserId: string,
  senderId: string,
  otherLastReadAt: string | null,
): MessageDeliveryStatus {
  if (senderId !== currentUserId) return 'delivered';
  if (otherLastReadAt && createdAt <= otherLastReadAt) return 'read';
  return 'sent';
}

function mapMessage(
  row: DbMessage,
  currentUserId: string,
  otherLastReadAt: string | null,
): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.deleted_for_all ? 'Bu mesaj silindi' : row.content,
    mediaUrl: row.deleted_for_all ? null : row.media_url,
    messageType: row.message_type,
    replyToId: row.reply_to_id,
    forwardedFromId: row.forwarded_from_id,
    forwardedFrom: row.forwarded_from,
    editedAt: row.edited_at,
    deletedForAll: row.deleted_for_all,
    isRead: row.is_read,
    createdAt: row.created_at,
    sender: row.sender,
    replyTo: row.reply_to,
    metadata: (row.metadata as ChatMessage['metadata']) ?? null,
    localStatus: deliveryStatus(row, currentUserId, otherLastReadAt),
  };
}

async function attachSenders(rows: DbMessage[]): Promise<DbMessage[]> {
  const senderIds = [...new Set(rows.map((r) => r.sender_id))];
  if (senderIds.length === 0) return rows;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, account_status')
    .in('id', senderIds);

  const byId = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        ...p,
        full_name: sanitizeDisplayName(p.full_name, p.username, p.account_status),
        avatar_url: sanitizeAvatarUrl(p.avatar_url, p.account_status),
      },
    ]),
  );
  return rows.map((row) => ({
    ...row,
    sender: byId.get(row.sender_id) ?? row.sender,
  }));
}

const REPLY_SELECT = `
  id, content, sender_id, message_type,
  sender:sender_id (id, username, full_name, avatar_url, account_status)
`;

async function attachReplyPreviews(rows: DbMessage[]): Promise<DbMessage[]> {
  const replyIds = [
    ...new Set(rows.map((r) => r.reply_to_id).filter((id): id is string => !!id)),
  ];
  if (replyIds.length === 0) return rows;

  const { data } = await supabase.from('messages').select(REPLY_SELECT).in('id', replyIds);
  const byId = new Map(((data ?? []) as DbMessage[]).map((r) => [r.id, r]));
  return rows.map((row) => ({
    ...row,
    reply_to: row.reply_to_id ? (byId.get(row.reply_to_id) ?? row.reply_to) : row.reply_to,
  }));
}

async function hydrateRpcMessages(
  rows: DbMessage[],
  currentUserId: string,
  otherLastReadAt: string | null,
): Promise<ChatMessage[]> {
  if (rows.length === 0) return [];

  let enriched = await attachSenders(rows);
  enriched = await attachReplyPreviews(enriched);
  return enriched.map((r) => mapMessage(r, currentUserId, otherLastReadAt));
}

async function deletedMessageIdsForUser(
  currentUserId: string,
  messageIds: string[],
): Promise<Set<string>> {
  if (messageIds.length === 0) return new Set();

  const { data: deletions } = await supabase
    .from('message_deletions')
    .select('message_id')
    .eq('user_id', currentUserId)
    .in('message_id', messageIds);

  return new Set((deletions ?? []).map((d) => d.message_id));
}

async function fetchMessagesDirect(
  conversationId: string,
  currentUserId: string,
  otherLastReadAt: string | null,
  limit: number,
  before?: string,
): Promise<ChatMessage[]> {
  let query = supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('conversation_id', conversationId)
    .eq('deleted_for_all', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as DbMessage[]).reverse();
  const deleted = await deletedMessageIdsForUser(
    currentUserId,
    rows.map((r) => r.id),
  );
  return rows
    .filter((r) => !deleted.has(r.id))
    .map((r) => mapMessage(r, currentUserId, otherLastReadAt));
}

export async function fetchMessages(
  conversationId: string,
  currentUserId: string,
  otherLastReadAt: string | null = null,
  limit = 50,
  before?: string,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase.rpc('get_conversation_messages', {
    p_conversation_id: conversationId,
    p_limit: limit,
    p_before: before ?? null,
  });

  if (error) {
    return fetchMessagesDirect(conversationId, currentUserId, otherLastReadAt, limit, before);
  }

  const rows = ((data ?? []) as DbMessage[]).slice().reverse();
  return hydrateRpcMessages(rows, currentUserId, otherLastReadAt);
}

/** Realtime kaçırdığında — belirli bir zamandan sonraki mesajları çeker. */
export async function fetchMessagesAfter(
  conversationId: string,
  currentUserId: string,
  otherLastReadAt: string | null,
  afterCreatedAt: string,
  limit = 50,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('conversation_id', conversationId)
    .eq('deleted_for_all', false)
    .gt('created_at', afterCreatedAt)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;

  const rows = (data ?? []) as DbMessage[];
  const deleted = await deletedMessageIdsForUser(
    currentUserId,
    rows.map((r) => r.id),
  );
  const visible = rows.filter((r) => !deleted.has(r.id));
  return visible.map((r) => mapMessage(r, currentUserId, otherLastReadAt));
}

async function sendMessageDirect(
  conversationId: string,
  senderId: string,
  content: string,
  options?: {
    messageType?: MessageType;
    mediaUrl?: string | null;
    replyToId?: string | null;
    forwardedFromId?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<{ message: ChatMessage | null; error: string | null }> {
  const payload: Record<string, unknown> = {
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    media_url: options?.mediaUrl ?? null,
    message_type: options?.messageType ?? 'text',
    reply_to_id: isValidUuid(options?.replyToId) ? options.replyToId : null,
  };
  if (options?.metadata) payload.metadata = options.metadata;
  if (isValidUuid(options?.forwardedFromId)) {
    payload.forwarded_from_id = options.forwardedFromId;
  }

  const { data, error } = await supabase
    .from('messages')
    .insert(payload)
    .select(
      'id, conversation_id, sender_id, content, media_url, message_type, metadata, reply_to_id, forwarded_from_id, edited_at, deleted_for_all, is_read, created_at',
    )
    .single();

  if (error) return { message: null, error: alertBlockError(error.message) };

  const [withSender] = await attachSenders([data as DbMessage]);
  notifyMessageRecipientsPush({
    conversationId,
    messageId: withSender.id,
    senderId,
    content,
    messageType: options?.messageType ?? 'text',
  });
  return {
    message: mapMessage(withSender, senderId, null),
    error: null,
  };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  options?: {
    messageType?: MessageType;
    mediaUrl?: string | null;
    replyToId?: string | null;
    forwardedFromId?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<{ message: ChatMessage | null; error: string | null }> {
  if (!isValidUuid(conversationId)) {
    return { message: null, error: 'Geçersiz sohbet kimliği' };
  }

  const rpcArgs = {
    p_conversation_id: conversationId,
    p_content: content,
    p_message_type: options?.messageType ?? 'text',
    p_media_url: options?.mediaUrl ?? null,
    p_reply_to_id: isValidUuid(options?.replyToId) ? options.replyToId : null,
    p_forwarded_from_id: isValidUuid(options?.forwardedFromId) ? options.forwardedFromId : null,
    p_metadata: options?.metadata ?? null,
  };

  const { data: rpcRows, error: rpcError } = await supabase.rpc('send_message', rpcArgs);

  if (rpcError) {
    const blockMessage = alertBlockError(rpcError.message);
    if (isBlockedByUserError(rpcError.message) || blockMessage.includes('engellediniz')) {
      return { message: null, error: blockMessage };
    }
  }

  if (!rpcError && rpcRows && (rpcRows as DbMessage[]).length > 0) {
    const [withSender] = await attachSenders([(rpcRows as DbMessage[])[0]]);
    notifyMessageRecipientsPush({
      conversationId,
      messageId: withSender.id,
      senderId,
      content,
      messageType: options?.messageType ?? 'text',
    });
    return {
      message: mapMessage(withSender, senderId, null),
      error: null,
    };
  }

  return sendMessageDirect(conversationId, senderId, content, options);
}

export async function markConversationRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (!error) {
    useMessagingStore.getState().acknowledgeConversationRead(conversationId);
    void markConversationNotificationsRead(userId, conversationId).catch(() => undefined);
    await refreshMessagingUnreadFromServer(userId);
  }
}

export async function editMessage(
  messageId: string,
  content: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('messages')
    .update({ content, edited_at: new Date().toISOString() })
    .eq('id', messageId);

  return { error: supabaseErrorMessage(error) };
}

export async function deleteMessageForMe(
  messageId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('message_deletions')
    .upsert({ message_id: messageId, user_id: userId });

  return { error: supabaseErrorMessage(error) };
}

export async function deleteMessageForAll(messageId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('messages')
    .update({ deleted_for_all: true, content: '' })
    .eq('id', messageId);

  return { error: supabaseErrorMessage(error) };
}
