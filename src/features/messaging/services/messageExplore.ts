import { getMuxThumbnailUrl } from '@/lib/mux/client';
import { supabase } from '@/lib/supabase/client';
import { CHAT_GALLERY_PAGE_SIZE } from '../constants';
import type { ChatMessage, MessageType } from '../types';

const GALLERY_MESSAGE_SELECT =
  'id, conversation_id, sender_id, content, media_url, message_type, reply_to_id, forwarded_from_id, edited_at, deleted_for_all, is_read, created_at';

type DbMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  message_type: MessageType;
  reply_to_id: string | null;
  forwarded_from_id: string | null;
  edited_at: string | null;
  deleted_for_all: boolean;
  is_read: boolean;
  created_at: string;
};

export type MediaGalleryTab = 'media' | 'videos' | 'files' | 'links';

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

export function extractLinks(content: string): string[] {
  return [...new Set(content.match(URL_REGEX) ?? [])];
}

export function resolveGalleryThumbnailUrl(message: ChatMessage): string | null {
  if (!message.mediaUrl) return null;

  if (message.messageType === 'video') {
    const streamMatch = message.mediaUrl.match(/stream\.mux\.com\/([^./?]+)/);
    if (streamMatch?.[1]) return getMuxThumbnailUrl(streamMatch[1]);
    if (message.mediaUrl.includes('image.mux.com')) return message.mediaUrl;
    return null;
  }

  return message.mediaUrl;
}

async function getDeletedMessageIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('message_deletions')
    .select('message_id')
    .eq('user_id', userId);
  return new Set((data ?? []).map((d) => d.message_id));
}

function mapRow(row: DbMessage): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    mediaUrl: row.media_url,
    messageType: row.message_type,
    replyToId: row.reply_to_id,
    forwardedFromId: row.forwarded_from_id,
    editedAt: row.edited_at,
    deletedForAll: row.deleted_for_all,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

async function attachSenders(messages: ChatMessage[]): Promise<ChatMessage[]> {
  const senderIds = [...new Set(messages.map((message) => message.senderId))];
  if (senderIds.length === 0) return messages;

  const { data } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, account_status')
    .in('id', senderIds);

  const profilesById = new Map(
    (data ?? []).map((profile) => [
      profile.id as string,
      {
        id: profile.id as string,
        username: profile.username as string,
        full_name: (profile.full_name as string | null) ?? null,
        avatar_url: (profile.avatar_url as string | null) ?? null,
        account_status: profile.account_status,
      },
    ]),
  );

  return messages.map((message) => ({
    ...message,
    sender: profilesById.get(message.senderId) as ChatMessage['sender'],
  }));
}

function tabMessageTypes(tab: MediaGalleryTab): MessageType[] | null {
  switch (tab) {
    case 'media':
      return ['image'];
    case 'videos':
      return ['video'];
    case 'files':
      return ['file', 'audio'];
    case 'links':
      return null;
    default:
      return null;
  }
}

export async function searchConversationMessages(
  conversationId: string,
  userId: string,
  query: string,
  limit = 40,
): Promise<ChatMessage[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const deleted = await getDeletedMessageIds(userId);

  const { data, error } = await supabase
    .from('messages')
    .select(GALLERY_MESSAGE_SELECT)
    .eq('conversation_id', conversationId)
    .eq('deleted_for_all', false)
    .ilike('content', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return attachSenders(
    ((data ?? []) as DbMessage[]).filter((r) => !deleted.has(r.id)).map(mapRow),
  );
}

export type GalleryMessagesPage = {
  items: ChatMessage[];
  hasMore: boolean;
};

export async function fetchGalleryMessages(
  conversationId: string,
  userId: string,
  tab: MediaGalleryTab,
  limit = CHAT_GALLERY_PAGE_SIZE,
  offset = 0,
): Promise<ChatMessage[]> {
  const deleted = await getDeletedMessageIds(userId);
  const types = tabMessageTypes(tab);

  let query = supabase
    .from('messages')
    .select(GALLERY_MESSAGE_SELECT)
    .eq('conversation_id', conversationId)
    .eq('deleted_for_all', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (types) {
    query = query.in('message_type', types);
  }

  if (tab === 'media' || tab === 'videos') {
    query = query.not('media_url', 'is', null);
  }

  if (tab === 'links') {
    query = query.or('content.ilike.%http://%,content.ilike.%https://%');
  }

  const { data, error } = await query;
  if (error) throw error;

  let rows = ((data ?? []) as DbMessage[]).filter((r) => !deleted.has(r.id));

  if (tab === 'links') {
    rows = rows.filter((r) => extractLinks(r.content).length > 0);
  }

  return attachSenders(rows.map(mapRow));
}

export async function fetchGalleryMessagesPage(
  conversationId: string,
  userId: string,
  tab: MediaGalleryTab,
  offset = 0,
  limit = CHAT_GALLERY_PAGE_SIZE,
): Promise<GalleryMessagesPage> {
  const items = await fetchGalleryMessages(conversationId, userId, tab, limit, offset);
  return { items, hasMore: items.length >= limit };
}
