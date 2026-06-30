import { getProfileLabel, notifyShareTarget, notifyUser } from '@/lib/notifications/helpers';
import { buildNotificationData } from '@/lib/notifications/notificationPayload';
import { isUniqueViolation } from '@/lib/supabase/postgresErrors';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

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
    return { error: supabaseErrorMessage(error) };
  }

  const { error } = await supabase.from('reel_likes').insert({ reel_id: reelId, user_id: userId });

  if (error && !isUniqueViolation(error)) {
    return { error: supabaseErrorMessage(error)! };
  }

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
        buildNotificationData({ reelId }),
      );
    }
  }

  return { error: null };
}

export async function deleteReel(
  reelId: string,
  userId: string,
): Promise<{ error: string | null }> {
  if (reelId.startsWith('demo-')) return { error: null };

  const { data: reel, error: fetchError } = await supabase
    .from('reels')
    .select('author_id')
    .eq('id', reelId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!reel || reel.author_id !== userId) {
    return { error: 'Bu reeli silme yetkiniz yok.' };
  }

  const { error } = await supabase
    .from('reels')
    .update({ status: 'removed' })
    .eq('id', reelId)
    .eq('author_id', userId);

  return { error: supabaseErrorMessage(error) };
}

export async function toggleReelSave(
  reelId: string,
  userId: string,
  isSaved: boolean,
): Promise<{ error: string | null }> {
  if (reelId.startsWith('demo-')) return { error: null };

  if (isSaved) {
    const { error } = await supabase
      .from('reel_saves')
      .delete()
      .eq('reel_id', reelId)
      .eq('user_id', userId);
    if (!error) {
      const { data } = await supabase.from('reels').select('save_count').eq('id', reelId).maybeSingle();
      if (data) {
        await supabase
          .from('reels')
          .update({ save_count: Math.max(0, (data.save_count ?? 1) - 1) })
          .eq('id', reelId);
      }
    }
    return { error: supabaseErrorMessage(error) };
  }

  const { error } = await supabase.from('reel_saves').insert({ reel_id: reelId, user_id: userId });
  if (error && !isUniqueViolation(error)) {
    return { error: supabaseErrorMessage(error)! };
  }
  if (!error) {
    const { data } = await supabase.from('reels').select('save_count').eq('id', reelId).maybeSingle();
    if (data) {
      await supabase.from('reels').update({ save_count: (data.save_count ?? 0) + 1 }).eq('id', reelId);
    }
  }
  return { error: null };
}

export async function recordReelShare(reelId: string, actorId?: string): Promise<void> {
  if (reelId.startsWith('demo-')) return;
  const { data } = await supabase.from('reels').select('share_count, author_id').eq('id', reelId).maybeSingle();
  if (data) {
    await supabase.from('reels').update({ share_count: (data.share_count ?? 0) + 1 }).eq('id', reelId);
    if (actorId && data.author_id && data.author_id !== actorId) {
      const actor = await getProfileLabel(actorId);
      await notifyShareTarget(
        data.author_id,
        actorId,
        'Reelin paylaşıldı',
        `${actor} reelini paylaştı`,
        buildNotificationData({ reelId }),
      );
    }
  }
}

export async function recordReelCompleteView(reelId: string): Promise<boolean> {
  if (reelId.startsWith('demo-')) return false;
  const { data } = await supabase.rpc('record_reel_complete_view', { p_reel_id: reelId });
  return data ?? false;
}
