import { supabase } from '@/lib/supabase/client';

export async function toggleReelLike(
  reelId: string,
  userId: string,
  isLiked: boolean,
): Promise<{ error: string | null }> {
  if (reelId.startsWith('demo-')) return { error: null };

  if (isLiked) {
    const { error } = await supabase
      .from('reel_likes')
      .delete()
      .eq('reel_id', reelId)
      .eq('user_id', userId);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase.from('reel_likes').insert({ reel_id: reelId, user_id: userId });
  return { error: error?.message ?? null };
}
