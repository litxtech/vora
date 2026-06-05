import type { ContentFollowType } from '@/features/map/types';
import { supabase } from '@/lib/supabase/client';

const TABLE_BY_TYPE = {
  event: 'event_follows',
  incident: 'incident_follows',
} as const;

const ID_COLUMN = {
  event: 'event_id',
  incident: 'incident_id',
} as const;

export async function isContentFollowed(
  type: ContentFollowType,
  contentId: string,
  userId: string,
): Promise<boolean> {
  if (contentId.startsWith('demo-')) return false;

  const table = TABLE_BY_TYPE[type];
  const idColumn = ID_COLUMN[type];

  const { data } = await supabase
    .from(table)
    .select('user_id')
    .eq('user_id', userId)
    .eq(idColumn, contentId)
    .maybeSingle();

  return data != null;
}

export async function toggleContentFollow(
  type: ContentFollowType,
  contentId: string,
  userId: string,
  currentlyFollowing: boolean,
): Promise<{ error: string | null; following: boolean }> {
  if (contentId.startsWith('demo-')) {
    return { error: null, following: !currentlyFollowing };
  }

  const table = TABLE_BY_TYPE[type];
  const idColumn = ID_COLUMN[type];

  if (currentlyFollowing) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', userId)
      .eq(idColumn, contentId);
    return { error: error?.message ?? null, following: false };
  }

  const { error } = await supabase.from(table).insert({
    user_id: userId,
    [idColumn]: contentId,
    notify_on_update: true,
  });

  return { error: error?.message ?? null, following: true };
}
