import type { ConversationListItem } from '../types';
import type { ChatMessage, MessageType } from '../types';

export type IncomingMessageRow = {
  id?: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType | string;
  media_url?: string | null;
  reply_to_id?: string | null;
  forwarded_from_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  deleted_for_all?: boolean;
};

export function messagePreviewFromRow(row: IncomingMessageRow): string {
  if (row.deleted_for_all) return 'Bu mesaj silindi';

  switch (row.message_type) {
    case 'image':
      return 'Fotoğraf gönderdi';
    case 'video':
      return 'Video gönderdi';
    case 'audio':
      return 'Ses kaydı gönderdi';
    case 'location':
      return 'Konum paylaştı';
    case 'file':
      return 'Dosya gönderdi';
    case 'shared_post':
      return 'Gönderi paylaştı';
    case 'shared_reel':
      return 'Reel paylaştı';
    case 'shared_profile':
      return 'Profil paylaştı';
    case 'shared_marketplace_listing':
      return 'Pazar ilanı paylaştı';
    case 'shared_job_listing':
      return 'İş ilanı paylaştı';
    case 'shared_staff_listing':
      return 'Personel talebi paylaştı';
    case 'shared_vora_need':
      return 'İhtiyaç ilanı paylaştı';
    case 'call':
      return row.content?.trim() || 'Arama kaydı';
    default:
      return (row.content ?? '').slice(0, 180);
  }
}

/** Inbox realtime satırını sohbet balonuna çevirir (chat kanalı kaçırırsa yedek). */
export function incomingRowToChatMessage(
  row: IncomingMessageRow,
  currentUserId: string | null,
): ChatMessage | null {
  if (!row.id) return null;

  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.deleted_for_all ? 'Bu mesaj silindi' : row.content ?? '',
    mediaUrl: row.deleted_for_all ? null : row.media_url ?? null,
    messageType: (row.message_type as MessageType) ?? 'text',
    replyToId: row.reply_to_id ?? null,
    forwardedFromId: row.forwarded_from_id ?? null,
    editedAt: null,
    deletedForAll: row.deleted_for_all ?? false,
    isRead: false,
    createdAt: row.created_at,
    metadata: (row.metadata as ChatMessage['metadata']) ?? null,
    localStatus: row.sender_id === currentUserId ? 'sent' : 'delivered',
  };
}

export function reorderConversationList(
  list: ConversationListItem[],
  updated: ConversationListItem,
): ConversationListItem[] {
  const rest = list.filter((c) => c.id !== updated.id);
  const pinned = rest.filter((c) => c.isPinned);
  const unpinned = rest.filter((c) => !c.isPinned);

  if (updated.isPinned) {
    return [updated, ...pinned, ...unpinned];
  }

  return [...pinned, updated, ...unpinned];
}

export function applyIncomingMessageToConversationList(
  list: ConversationListItem[],
  row: IncomingMessageRow,
  currentUserId: string,
  activeConversationId: string | null,
): { list: ConversationListItem[]; needsFullRefresh: boolean } {
  const idx = list.findIndex((c) => c.id === row.conversation_id);
  if (idx === -1) {
    return { list, needsFullRefresh: true };
  }

  const isIncoming = row.sender_id !== currentUserId;
  const isActiveChat = activeConversationId === row.conversation_id;
  const current = list[idx];

  const updated: ConversationListItem = {
    ...current,
    lastMessageAt: row.created_at,
    lastMessagePreview: messagePreviewFromRow(row),
    unreadCount:
      isIncoming && !isActiveChat ? current.unreadCount + 1 : current.unreadCount,
  };

  return {
    list: reorderConversationList(list, updated),
    needsFullRefresh: false,
  };
}

export function applyConversationRead(
  list: ConversationListItem[],
  conversationId: string,
): ConversationListItem[] {
  const idx = list.findIndex((c) => c.id === conversationId);
  if (idx === -1 || list[idx].unreadCount === 0) return list;
  return list.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c));
}

export function applyConversationPreviewUpdate(
  list: ConversationListItem[],
  conversationId: string,
  lastMessageAt: string | null,
  lastMessagePreview: string | null,
): ConversationListItem[] {
  const idx = list.findIndex((c) => c.id === conversationId);
  if (idx === -1) return list;

  const updated: ConversationListItem = {
    ...list[idx],
    lastMessageAt: lastMessageAt ?? list[idx].lastMessageAt,
    lastMessagePreview: lastMessagePreview ?? list[idx].lastMessagePreview,
  };

  return reorderConversationList(list, updated);
}
