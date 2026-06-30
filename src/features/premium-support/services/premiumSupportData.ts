import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type {
  PremiumSupportMessage,
  PremiumSupportThread,
  PremiumSupportTopic,
} from '@/features/premium-support/types';

function mapMessage(
  row: PremiumSupportMessage,
  profilesById: Map<string, { username: string; full_name: string | null; role: string }>,
): PremiumSupportMessage {
  const profile = profilesById.get(row.sender_id);
  const role = profile?.role ?? '';
  return {
    ...row,
    sender_username: profile?.username,
    sender_full_name: profile?.full_name,
    is_staff: ['moderator', 'admin', 'super_admin'].includes(role),
  };
}

async function attachSenderProfiles(
  messages: PremiumSupportMessage[],
): Promise<PremiumSupportMessage[]> {
  const senderIds = [...new Set(messages.map((message) => message.sender_id))];
  if (senderIds.length === 0) return messages;

  const { data } = await supabase
    .from('profiles')
    .select('id, username, full_name, role')
    .in('id', senderIds);

  const profilesById = new Map(
    (data ?? []).map((profile) => [
      profile.id as string,
      {
        username: profile.username as string,
        full_name: (profile.full_name as string | null) ?? null,
        role: (profile.role as string) ?? 'user',
      },
    ]),
  );

  return messages.map((message) => mapMessage(message, profilesById));
}

export async function expirePremiumSupportSessions(): Promise<void> {
  await supabase.rpc('expire_premium_support_sessions');
}

export async function fetchMyPremiumSupportThread(): Promise<PremiumSupportThread | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await expirePremiumSupportSessions();

  const { data, error } = await supabase
    .from('premium_support_threads')
    .select(
      'id, user_id, subject, topic, status, user_unread_count, support_unread_count, last_message_at, last_message_preview, subscription_snapshot, created_at, updated_at, resolved_at, session_expires_at',
    )
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as PremiumSupportThread;
}

export async function fetchPremiumSupportMessages(
  threadId: string,
  limit = 100,
): Promise<PremiumSupportMessage[]> {
  const { data, error } = await supabase
    .from('premium_support_messages')
    .select('id, thread_id, sender_id, content, message_type, media_url, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return attachSenderProfiles(data as PremiumSupportMessage[]);
}

export async function startPremiumSupportThread(
  message: string,
  topic?: PremiumSupportTopic | null,
  options?: { messageType?: 'text' | 'image'; mediaUrl?: string | null },
): Promise<{ threadId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('start_premium_support_thread', {
    p_message: message.trim(),
    p_topic: topic ?? null,
    p_subject: 'Premium Abonelik Desteği',
    p_message_type: options?.messageType ?? 'text',
    p_media_url: options?.mediaUrl ?? null,
  });

  if (error) return { threadId: null, error: supabaseErrorMessage(error)! };
  return { threadId: data as string, error: null };
}

export async function sendPremiumSupportMessage(
  threadId: string,
  content: string,
  options?: { messageType?: 'text' | 'image'; mediaUrl?: string | null },
): Promise<{ messageId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('send_premium_support_message', {
    p_thread_id: threadId,
    p_content: content.trim(),
    p_message_type: options?.messageType ?? 'text',
    p_media_url: options?.mediaUrl ?? null,
  });

  if (error) return { messageId: null, error: supabaseErrorMessage(error)! };
  return { messageId: data as string, error: null };
}

export async function markPremiumSupportRead(threadId: string): Promise<void> {
  await supabase.rpc('mark_premium_support_read', { p_thread_id: threadId });
}

export async function adminListPremiumSupportThreads(
  status: 'all' | PremiumSupportThread['status'] = 'all',
  limit = 50,
): Promise<PremiumSupportThread[]> {
  const { data, error } = await supabase.rpc('admin_list_premium_support_threads', {
    p_status: status,
    p_limit: limit,
  });

  if (error) return [];
  return (data ?? []) as PremiumSupportThread[];
}

export async function adminUpdatePremiumSupportThread(
  threadId: string,
  status: PremiumSupportThread['status'],
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_update_premium_support_thread', {
    p_thread_id: threadId,
    p_status: status,
  });

  return { error: supabaseErrorMessage(error) };
}

export async function adminFetchPremiumSupportThread(
  threadId: string,
): Promise<PremiumSupportThread | null> {
  await expirePremiumSupportSessions();

  const { data, error } = await supabase
    .from('premium_support_threads')
    .select(
      'id, user_id, subject, topic, status, user_unread_count, support_unread_count, last_message_at, last_message_preview, subscription_snapshot, created_at, updated_at, resolved_at, session_expires_at',
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
    ...(data as PremiumSupportThread),
    username: profile?.username as string | undefined,
    full_name: (profile?.full_name as string | null) ?? null,
  };
}
