import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type {
  LiveSupportMessage,
  LiveSupportMessageType,
  LiveSupportThread,
  LiveSupportTopic,
} from '@/features/live-support/types';

function mapMessage(
  row: LiveSupportMessage,
  profilesById: Map<
    string,
    {
      username: string;
      full_name: string | null;
      role: string;
      avatar_url: string | null;
      account_status: LiveSupportMessage['sender_account_status'];
    }
  >,
): LiveSupportMessage {
  const profile = profilesById.get(row.sender_id);
  const role = profile?.role ?? '';
  return {
    ...row,
    sender_username: profile?.username,
    sender_full_name: profile?.full_name,
    sender_avatar_url: profile?.avatar_url,
    sender_account_status: profile?.account_status,
    is_staff: ['moderator', 'admin', 'super_admin'].includes(role),
  };
}

async function attachSenderProfiles(messages: LiveSupportMessage[]): Promise<LiveSupportMessage[]> {
  const senderIds = [...new Set(messages.map((message) => message.sender_id))];
  if (senderIds.length === 0) return messages;

  const { data } = await supabase
    .from('profiles')
    .select('id, username, full_name, role, avatar_url, account_status')
    .in('id', senderIds);

  const profilesById = new Map(
    (data ?? []).map((profile) => [
      profile.id as string,
      {
        username: profile.username as string,
        full_name: (profile.full_name as string | null) ?? null,
        role: (profile.role as string) ?? 'user',
        avatar_url: (profile.avatar_url as string | null) ?? null,
        account_status: profile.account_status as LiveSupportMessage['sender_account_status'],
      },
    ]),
  );

  return messages.map((message) => mapMessage(message, profilesById));
}

export async function expireLiveSupportSessions(): Promise<void> {
  await supabase.rpc('expire_live_support_sessions');
}

export async function fetchMyLiveSupportThread(): Promise<LiveSupportThread | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await expireLiveSupportSessions();

  const { data, error } = await supabase
    .from('live_support_threads')
    .select(
      'id, user_id, subject, topic, status, user_unread_count, support_unread_count, last_message_at, last_message_preview, created_at, updated_at, resolved_at, session_expires_at',
    )
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as LiveSupportThread;
}

export async function fetchLiveSupportMessages(
  threadId: string,
  limit = 100,
): Promise<LiveSupportMessage[]> {
  const { data, error } = await supabase
    .from('live_support_messages')
    .select('id, thread_id, sender_id, content, message_type, media_url, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return attachSenderProfiles(data as LiveSupportMessage[]);
}

export async function startLiveSupportThread(
  message: string,
  topic?: LiveSupportTopic | null,
  options?: { messageType?: LiveSupportMessageType; mediaUrl?: string | null },
): Promise<{ threadId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('start_live_support_thread', {
    p_message: message.trim(),
    p_topic: topic ?? null,
    p_subject: 'Canlı Destek',
    p_message_type: options?.messageType ?? 'text',
    p_media_url: options?.mediaUrl ?? null,
  });

  if (error) return { threadId: null, error: supabaseErrorMessage(error)! };
  return { threadId: data as string, error: null };
}

export async function sendLiveSupportMessage(
  threadId: string,
  content: string,
  options?: { messageType?: LiveSupportMessageType; mediaUrl?: string | null },
): Promise<{ messageId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('send_live_support_message', {
    p_thread_id: threadId,
    p_content: content.trim(),
    p_message_type: options?.messageType ?? 'text',
    p_media_url: options?.mediaUrl ?? null,
  });

  if (error) return { messageId: null, error: supabaseErrorMessage(error)! };
  return { messageId: data as string, error: null };
}

export async function markLiveSupportRead(threadId: string): Promise<void> {
  await supabase.rpc('mark_live_support_read', { p_thread_id: threadId });
}

export async function adminListLiveSupportThreads(
  status: 'all' | LiveSupportThread['status'] = 'all',
  limit = 50,
): Promise<LiveSupportThread[]> {
  const { data, error } = await supabase.rpc('admin_list_live_support_threads', {
    p_status: status,
    p_limit: limit,
  });

  if (error) return [];
  return (data ?? []) as LiveSupportThread[];
}

export async function adminUpdateLiveSupportThread(
  threadId: string,
  status: LiveSupportThread['status'],
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_update_live_support_thread', {
    p_thread_id: threadId,
    p_status: status,
  });

  return { error: supabaseErrorMessage(error) };
}

export async function adminFetchLiveSupportThread(
  threadId: string,
): Promise<LiveSupportThread | null> {
  await expireLiveSupportSessions();

  const { data, error } = await supabase
    .from('live_support_threads')
    .select(
      'id, user_id, subject, topic, status, user_unread_count, support_unread_count, last_message_at, last_message_preview, created_at, updated_at, resolved_at, session_expires_at',
    )
    .eq('id', threadId)
    .maybeSingle();

  if (error || !data) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name')
    .eq('id', data.user_id)
    .maybeSingle();

  return {
    ...(data as LiveSupportThread),
    username: profile?.username as string | undefined,
    full_name: (profile?.full_name as string | null) ?? null,
  };
}
