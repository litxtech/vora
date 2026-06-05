import { getProfileLabel, notifyUser } from '@/lib/notifications/helpers';
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

  if (!error) {
    const { data: reel } = await supabase
      .from('reels')
      .select('author_id')
      .eq('id', reelId)
      .maybeSingle();

    if (reel?.author_id) {
      const actor = await getProfileLabel(userId);
      await notifyUser(
        reel.author_id,
        'reel_like',
        'Reel beğenisi',
        `${actor} reelini beğendi`,
        userId,
        { reelId },
      );
    }
  }

  return { error: error?.message ?? null };
}
