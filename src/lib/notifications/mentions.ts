import { notifyUser } from '@/lib/notifications/helpers';
import { buildNotificationData } from '@/lib/notifications/notificationPayload';
import { supabase } from '@/lib/supabase/client';

const MENTION_PATTERN = /@([\w.]{2,30})/g;

export function extractMentionUsernames(text: string): string[] {
  const matches = text.matchAll(MENTION_PATTERN);
  const usernames = new Set<string>();
  for (const match of matches) {
    const username = match[1]?.toLowerCase();
    if (username) usernames.add(username);
  }
  return [...usernames];
}

export async function notifyMentionedUsers(
  text: string,
  actorId: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  const usernames = extractMentionUsernames(text);
  if (usernames.length === 0) return;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('username', usernames);

  const payload = buildNotificationData(data);

  for (const profile of profiles ?? []) {
    if (profile.id === actorId) continue;
    await notifyUser(profile.id, 'mention', title, body, actorId, payload);
  }
}
