import { supabase } from '@/lib/supabase/client';

export async function recordProfileView(profileId: string): Promise<boolean> {
  const { data } = await supabase.rpc('record_profile_view', { p_profile_id: profileId });
  return data ?? false;
}

export async function fetchRecentProfileViewers(
  profileId: string,
  limit = 10,
): Promise<
  {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    viewedAt: string;
  }[]
> {
  const { data } = await supabase
    .from('profile_views')
    .select(
      `viewer_id, created_at,
       profiles!profile_views_viewer_id_fkey (id, username, full_name, avatar_url)`,
    )
    .eq('profile_id', profileId)
    .not('viewer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  type Row = {
    viewer_id: string;
    created_at: string;
    profiles: {
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.profiles)
    .map((r) => ({
      id: r.profiles!.id,
      username: r.profiles!.username,
      fullName: r.profiles!.full_name,
      avatarUrl: r.profiles!.avatar_url,
      viewedAt: r.created_at,
    }));
}
