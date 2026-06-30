import { sanitizeAvatarUrl } from '@/features/account-deletion/utils';
import { supabase } from '@/lib/supabase/client';

export type NotificationActorProfile = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export async function fetchNotificationActorProfiles(
  actorIds: string[],
): Promise<Map<string, NotificationActorProfile>> {
  const unique = [...new Set(actorIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, account_status')
    .in('id', unique);

  const map = new Map<string, NotificationActorProfile>();
  for (const row of data ?? []) {
    map.set(row.id as string, {
      id: row.id as string,
      username: (row.username as string) ?? 'kullanici',
      fullName: (row.full_name as string | null) ?? null,
      avatarUrl: sanitizeAvatarUrl(row.avatar_url as string | null, row.account_status as string | undefined),
    });
  }
  return map;
}
