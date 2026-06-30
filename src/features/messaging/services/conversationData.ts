import { mapMessagingParticipant } from '@/features/account-deletion/utils';
import { alertBlockError } from '@/features/moderation/utils/blockErrors';
import { supabase } from '@/lib/supabase/client';
import { fetchMutualFriendIds } from '@/features/profile/services/mutualFriends';
import { fetchConversationMembers } from './groupData';
import type { ConversationDetail, ConversationListItem, ConversationMemberRole } from '../types';

type RpcConversationRow = {
  conversation_id: string;
  conversation_type: 'direct' | 'group';
  title: string | null;
  avatar_url: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  other_user_id: string | null;
  other_username: string | null;
  other_full_name: string | null;
  other_avatar_url: string | null;
  unread_count: number;
  member_count: number;
  is_pinned: boolean;
  is_archived: boolean;
  muted_until: string | null;
  is_muted: boolean;
};

async function resolveOtherUser(base: {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
  is_platform_charm?: boolean;
  is_pioneer?: boolean;
  is_platform_supporter?: boolean;
  gender?: import('@/constants/registration').GenderId | null;
  last_seen_at?: string | null;
  is_online?: boolean | null;
  last_active_at?: string | null;
}) {
  const { data: meta } = await supabase
    .from('profiles')
    .select('account_status, is_online, last_active_at, is_platform_charm, is_pioneer, is_platform_supporter, gender')
    .eq('id', base.id)
    .maybeSingle();

  return mapMessagingParticipant({
    ...base,
    account_status: meta?.account_status ?? 'active',
    is_platform_charm: base.is_platform_charm ?? meta?.is_platform_charm ?? false,
    is_pioneer: base.is_pioneer ?? meta?.is_pioneer ?? false,
    is_platform_supporter: base.is_platform_supporter ?? meta?.is_platform_supporter ?? false,
    gender: base.gender ?? meta?.gender ?? null,
    is_online: base.is_online ?? meta?.is_online ?? false,
    last_active_at: base.last_active_at ?? meta?.last_active_at ?? null,
  });
}

function mapRpcRow(row: RpcConversationRow): ConversationListItem {
  return {
    id: row.conversation_id,
    type: row.conversation_type,
    title: row.title,
    avatarUrl: row.avatar_url,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview,
    otherUser: row.other_user_id
      ? mapMessagingParticipant({
          id: row.other_user_id,
          username: row.other_username ?? '',
          full_name: row.other_full_name,
          avatar_url: row.other_avatar_url,
        })
      : null,
    unreadCount: Number(row.unread_count ?? 0),
    memberCount: Number(row.member_count ?? 0),
    isPinned: row.is_pinned ?? false,
    isArchived: row.is_archived ?? false,
    isMuted: row.is_muted ?? false,
    mutedUntil: row.muted_until,
  };
}

export async function fetchConversationList(
  archivedOnly = false,
): Promise<ConversationListItem[]> {
  const { data, error } = await supabase.rpc('get_user_conversations', {
    p_archived_only: archivedOnly,
  });
  if (error) throw error;
  return ((data ?? []) as RpcConversationRow[]).map(mapRpcRow);
}

export async function fetchTotalUnreadCount(): Promise<number> {
  const list = await fetchConversationList(false);
  return list.reduce((sum, item) => sum + item.unreadCount, 0);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidConversationId(id: string) {
  return UUID_RE.test(id);
}

type RpcDetailRow = {
  id: string;
  conversation_type: 'direct' | 'group';
  title: string | null;
  avatar_url: string | null;
  other_user_id: string | null;
  other_username: string | null;
  other_full_name: string | null;
  other_avatar_url: string | null;
  other_is_verified: boolean | null;
  other_is_platform_charm: boolean | null;
  other_is_pioneer: boolean | null;
  other_is_platform_supporter: boolean | null;
  other_last_seen_at: string | null;
  other_is_online: boolean | null;
  other_last_active_at: string | null;
  other_last_read_at: string | null;
  member_count: number;
  my_role: ConversationMemberRole | null;
};

async function verifyConversationReadable(
  conversationId: string,
  attempts = 3,
): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    const { data, error } = await supabase.rpc('get_conversation_detail', {
      p_conversation_id: conversationId,
    });
    if (!error && (data as RpcDetailRow[] | null)?.length) return true;
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
    }
  }
  return false;
}

export async function getOrCreateDirectConversation(
  otherUserId: string,
): Promise<{ conversationId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    p_other_user_id: otherUserId,
  });

  if (error) return { conversationId: null, error: alertBlockError(error.message) };
  const conversationId = data as string;
  if (!conversationId || !isValidConversationId(conversationId)) {
    return { conversationId: null, error: 'Sohbet oluşturulamadı' };
  }

  // Silinmiş / gizlenmiş sohbeti yeniden görünür yap
  await supabase.rpc('show_conversation', { p_conversation_id: conversationId });

  const readable = await verifyConversationReadable(conversationId);
  if (!readable) {
    return { conversationId: null, error: 'Sohbet açılamadı. Lütfen tekrar deneyin.' };
  }

  return { conversationId, error: null };
}

export async function fetchConversationDetail(
  conversationId: string,
  currentUserId: string,
): Promise<ConversationDetail | null> {
  if (!isValidConversationId(conversationId)) return null;

  let rpcRows: RpcDetailRow[] | null = null;
  let rpcError: { message: string } | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await supabase.rpc('get_conversation_detail', {
      p_conversation_id: conversationId,
    });
    rpcError = result.error;
    rpcRows = (result.data as RpcDetailRow[] | null) ?? null;
    if (!rpcError && rpcRows && rpcRows.length > 0) break;
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  if (!rpcError && rpcRows && rpcRows.length > 0) {
    const row = (rpcRows as RpcDetailRow[])[0];
    const members =
      row.conversation_type === 'group'
        ? await fetchConversationMembers(conversationId)
        : [];

    return {
      id: row.id,
      type: row.conversation_type,
      title: row.title,
      avatarUrl: row.avatar_url,
      otherUser: row.other_user_id
        ? await resolveOtherUser({
            id: row.other_user_id,
            username: row.other_username ?? '',
            full_name: row.other_full_name,
            avatar_url: row.other_avatar_url,
            is_verified: row.other_is_verified ?? false,
            is_platform_charm: row.other_is_platform_charm ?? false,
            is_pioneer: row.other_is_pioneer ?? false,
            is_platform_supporter: row.other_is_platform_supporter ?? false,
            last_seen_at: row.other_last_seen_at,
            is_online: row.other_is_online ?? false,
            last_active_at: row.other_last_active_at,
          })
        : null,
      otherLastReadAt: row.other_last_read_at,
      members,
      memberCount: row.conversation_type === 'group' ? members.length : Number(row.member_count ?? 0),
      myRole: row.my_role,
    };
  }

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id, type, title, avatar_url')
    .eq('id', conversationId)
    .maybeSingle();

  if (error || !conversation) return null;

  let otherUser = null;
  let otherLastReadAt: string | null = null;
  let members: ConversationDetail['members'] = [];
  let myRole: ConversationMemberRole | null = null;

  const { data: memberRows } = await supabase
    .from('conversation_members')
    .select('user_id, last_read_at, role')
    .eq('conversation_id', conversationId);

  const myMember = (memberRows ?? []).find((m) => m.user_id === currentUserId);
  myRole = (myMember?.role as ConversationMemberRole) ?? null;

  if (conversation.type === 'direct') {
    const otherMember = (memberRows ?? []).find((m) => m.user_id !== currentUserId);
    if (otherMember) {
      otherLastReadAt = otherMember.last_read_at;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, account_status, is_verified, is_platform_charm, is_pioneer, is_platform_supporter, gender, last_seen_at, is_online, last_active_at')
        .eq('id', otherMember.user_id)
        .maybeSingle();

      if (profile) {
        otherUser = mapMessagingParticipant(profile);
      }
    }
  } else {
    members = await fetchConversationMembers(conversationId);
  }

  return {
    id: conversation.id,
    type: conversation.type,
    title: conversation.title,
    avatarUrl: conversation.avatar_url,
    otherUser,
    otherLastReadAt,
    members,
    memberCount: conversation.type === 'group' ? members.length : memberRows?.length ?? 0,
    myRole,
  };
}

export async function fetchFriends(
  userId: string,
): Promise<{ id: string; username: string; full_name: string | null; avatar_url: string | null }[]> {
  const friendIds = await fetchMutualFriendIds(userId);
  if (friendIds.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', friendIds);

  if (profileError) throw profileError;
  return (profiles ?? []).sort((a, b) => a.username.localeCompare(b.username, 'tr'));
}

export async function fetchCallHistory(
  userId: string,
): Promise<
  {
    id: string;
    call_type: 'audio' | 'video';
    status: string;
    started_at: string | null;
    ended_at: string | null;
    created_at: string;
    caller_id: string;
    callee_id: string;
    caller: { id: string; username: string; full_name: string | null; avatar_url: string | null };
    callee: { id: string; username: string; full_name: string | null; avatar_url: string | null };
  }[]
> {
  const { data, error } = await supabase
    .from('call_sessions')
    .select(
      `id, call_type, status, started_at, ended_at, created_at, caller_id, callee_id,
       caller:caller_id (id, username, full_name, avatar_url),
       callee:callee_id (id, username, full_name, avatar_url)`,
    )
    .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as never[];
}
