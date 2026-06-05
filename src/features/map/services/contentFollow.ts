import type { ContentFollowType } from '@/features/map/types';
import { supabase } from '@/lib/supabase/client';

export async function isContentFollowed(
  type: ContentFollowType,
  contentId: string,
  userId: string,
): Promise<boolean> {
  if (contentId.startsWith('demo-')) return false;

  if (type === 'event') {
    const { data } = await supabase
      .from('event_follows')
      .select('user_id')
      .eq('user_id', userId)
      .eq('event_id', contentId)
      .maybeSingle();
    return data != null;
  }

  const { data } = await supabase
    .from('incident_follows')
    .select('user_id')
    .eq('user_id', userId)
    .eq('incident_id', contentId)
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

  if (currentlyFollowing) {
    if (type === 'event') {
      const { error } = await supabase
        .from('event_follows')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', contentId);
      return { error: error?.message ?? null, following: false };
    }

    const { error } = await supabase
      .from('incident_follows')
      .delete()
      .eq('user_id', userId)
      .eq('incident_id', contentId);
    return { error: error?.message ?? null, following: false };
  }

  if (type === 'event') {
    const { error } = await supabase.from('event_follows').insert({
      user_id: userId,
      event_id: contentId,
      notify_on_update: true,
    });
    return { error: error?.message ?? null, following: true };
  }

  const { error } = await supabase.from('incident_follows').insert({
    user_id: userId,
    incident_id: contentId,
    notify_on_update: true,
  });
  return { error: error?.message ?? null, following: true };
}
