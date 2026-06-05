import { sendNotification } from '@/lib/notifications/dispatch';
import type { NotificationEventType } from '@/constants/notifications';
import { supabase } from '@/lib/supabase/client';

export async function getProfileLabel(userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('username, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (!data) return 'Birisi';
  return data.full_name ?? `@${data.username}`;
}

export async function notifyUser(
  recipientId: string,
  eventType: NotificationEventType,
  title: string,
  body: string,
  actorId?: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (recipientId === actorId) return;
  await sendNotification({ recipientId, eventType, title, body, actorId, data });
}

export async function notifyPostAuthor(
  postId: string,
  actorId: string,
  eventType: NotificationEventType,
  title: string,
  body: string,
): Promise<void> {
  const { data: post } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .maybeSingle();

  if (!post?.author_id) return;
  await notifyUser(post.author_id, eventType, title, body, actorId, { postId });
}
