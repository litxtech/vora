import type { ReelComment } from '@/features/reels/types';
import { shouldShowRestrictedComment } from '@/features/moderation/services/commentVisibility';
import { fetchHiddenAuthors } from '@/features/moderation/services/relationships';
import { getProfileLabel, notifyReelCommentTargets, notifyUser } from '@/lib/notifications/helpers';
import { notifyMentionedUsers } from '@/lib/notifications/mentions';
import { buildNotificationData } from '@/lib/notifications/notificationPayload';
import { supabase } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';
import { supabaseErrorMessage } from '@/lib/errors';

type CommentRow = {
  id: string;
  reel_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  like_count: number;
  is_edited: boolean;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    role: UserRole;
    is_verified: boolean;
    hidden_badges?: string[] | null;
  } | null;
};

function mapComment(row: CommentRow, likedIds: Set<string>): ReelComment {
  const profile = row.profiles;
  return {
    id: row.id,
    reelId: row.reel_id,
    author: {
      id: profile?.id ?? row.author_id,
      username: profile?.username ?? 'kullanici',
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      role: profile?.role ?? 'user',
      isVerified: profile?.is_verified ?? false,
      hiddenBadges: profile?.hidden_badges ?? [],
    },
    content: row.content,
    likeCount: row.like_count,
    isLiked: likedIds.has(row.id),
    isEdited: row.is_edited,
    parentId: row.parent_id,
    createdAt: row.created_at,
    replies: [],
  };
}

function nestComments(flat: ReelComment[]): ReelComment[] {
  const byId = new Map(flat.map((c) => [c.id, c]));
  const roots: ReelComment[] = [];

  for (const comment of flat) {
    if (comment.parentId && byId.has(comment.parentId)) {
      const parent = byId.get(comment.parentId)!;
      parent.replies = [...(parent.replies ?? []), comment];
    } else {
      roots.push(comment);
    }
  }

  return roots;
}

function filterReelComments(
  comments: ReelComment[],
  reelAuthorId: string | null | undefined,
  viewerId: string | null,
  restrictedIds: Set<string>,
): ReelComment[] {
  return comments
    .filter((c) => shouldShowRestrictedComment(c.author.id, reelAuthorId, viewerId, restrictedIds))
    .map((c) => ({
      ...c,
      replies: c.replies ? filterReelComments(c.replies, reelAuthorId, viewerId, restrictedIds) : [],
    }));
}

export async function fetchReelComments(
  reelId: string,
  userId: string | null,
  reelAuthorId?: string,
): Promise<ReelComment[]> {
  const { data } = await supabase
    .from('reel_comments')
    .select(
      `id, reel_id, author_id, parent_id, content, like_count, is_edited, created_at,
       profiles!reel_comments_author_id_fkey (id, username, full_name, avatar_url, role, is_verified, hidden_badges)`,
    )
    .eq('reel_id', reelId)
    .order('created_at', { ascending: true });

  const rows = (data ?? []) as unknown as CommentRow[];
  const commentIds = rows.map((r) => r.id);

  let likedIds = new Set<string>();
  if (userId && commentIds.length > 0) {
    const { data: likes } = await supabase
      .from('reel_comment_likes')
      .select('comment_id')
      .eq('user_id', userId)
      .in('comment_id', commentIds);
    likedIds = new Set((likes ?? []).map((l) => l.comment_id));
  }

  const nested = nestComments(rows.map((row) => mapComment(row, likedIds)));

  if (!userId) return nested;

  const hidden = await fetchHiddenAuthors(userId);
  return filterReelComments(nested, reelAuthorId, userId, hidden.restricted);
}

async function notifyReelAuthor(
  reelId: string,
  actorId: string,
  parentId: string | null | undefined,
  preview: string,
) {
  await notifyReelCommentTargets(reelId, actorId, parentId, preview);
  await notifyMentionedUsers(
    preview,
    actorId,
    'Senden bahsetti',
    `${await getProfileLabel(actorId)}: ${preview.slice(0, 80)}`,
    buildNotificationData({ reelId }),
  );
}

export async function addReelComment(
  reelId: string,
  authorId: string,
  content: string,
  parentId?: string,
): Promise<{ error: string | null }> {
  const trimmed = content.trim();
  const { error } = await supabase.from('reel_comments').insert({
    reel_id: reelId,
    author_id: authorId,
    content: trimmed,
    parent_id: parentId ?? null,
  });

  if (!error) {
    await notifyReelAuthor(reelId, authorId, parentId ?? null, trimmed);
  }

  return { error: supabaseErrorMessage(error) };
}

export async function deleteReelComment(
  commentId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('reel_comments')
    .delete()
    .eq('id', commentId)
    .eq('author_id', userId);

  return { error: supabaseErrorMessage(error) };
}

export async function editReelComment(
  commentId: string,
  userId: string,
  content: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('reel_comments')
    .update({ content: content.trim(), is_edited: true })
    .eq('id', commentId)
    .eq('author_id', userId);

  return { error: supabaseErrorMessage(error) };
}

export async function toggleReelCommentLike(
  commentId: string,
  userId: string,
  isLiked: boolean,
): Promise<{ error: string | null }> {
  if (isLiked) {
    const { error } = await supabase
      .from('reel_comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId);
    return { error: supabaseErrorMessage(error) };
  }

  const { error } = await supabase.from('reel_comment_likes').insert({
    comment_id: commentId,
    user_id: userId,
  });
  return { error: supabaseErrorMessage(error) };
}
