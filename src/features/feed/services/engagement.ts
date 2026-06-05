import type { FeedComment } from '@/features/feed/types';
import { getProfileLabel, notifyPostAuthor, notifyUser } from '@/lib/notifications/helpers';
import { supabase } from '@/lib/supabase/client';
import type { ReportReason, UserRole } from '@/types/database';

type CommentRow = {
  id: string;
  post_id: string;
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
  } | null;
};

function mapComment(row: CommentRow, likedIds: Set<string>): FeedComment {
  const profile = row.profiles;
  return {
    id: row.id,
    postId: row.post_id,
    author: {
      id: profile?.id ?? row.author_id,
      username: profile?.username ?? 'kullanici',
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      role: profile?.role ?? 'user',
      isVerified: profile?.is_verified ?? false,
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

function nestComments(flat: FeedComment[]): FeedComment[] {
  const byId = new Map(flat.map((c) => [c.id, c]));
  const roots: FeedComment[] = [];

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

export async function fetchPostComments(postId: string, userId: string | null): Promise<FeedComment[]> {
  if (postId.startsWith('demo-')) {
    return [
      {
        id: 'demo-comment-1',
        postId,
        author: {
          id: 'demo-c1',
          username: 'ahmet_k',
          fullName: 'Ahmet K.',
          avatarUrl: null,
          role: 'user',
          isVerified: false,
        },
        content: 'Olay yerinden geçiyorum, trafik yavaş ama açık.',
        likeCount: 4,
        isLiked: false,
        isEdited: false,
        parentId: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        replies: [
          {
            id: 'demo-comment-2',
            postId,
            author: {
              id: 'demo-c2',
              username: 'trabzonhaber',
              fullName: 'Trabzon Haber',
              avatarUrl: null,
              role: 'verified_reporter',
              isVerified: true,
            },
            content: 'Teşekkürler, bilgi güncellendi.',
            likeCount: 1,
            isLiked: false,
            isEdited: false,
            parentId: 'demo-comment-1',
            createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          },
        ],
      },
    ];
  }

  const { data } = await supabase
    .from('post_comments')
    .select(
      `id, post_id, author_id, parent_id, content, like_count, is_edited, created_at,
       profiles!post_comments_author_id_fkey (id, username, full_name, avatar_url, role, is_verified)`,
    )
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  const rows = (data ?? []) as unknown as CommentRow[];
  const commentIds = rows.map((r) => r.id);

  let likedIds = new Set<string>();
  if (userId && commentIds.length > 0) {
    const { data: likes } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', userId)
      .in('comment_id', commentIds);
    likedIds = new Set((likes ?? []).map((l) => l.comment_id));
  }

  return nestComments(rows.map((row) => mapComment(row, likedIds)));
}

export async function addComment(
  postId: string,
  authorId: string,
  content: string,
  parentId?: string,
): Promise<{ error: string | null }> {
  if (postId.startsWith('demo-')) {
    return { error: null };
  }

  const { error } = await supabase.from('post_comments').insert({
    post_id: postId,
    author_id: authorId,
    content: content.trim(),
    parent_id: parentId ?? null,
  });

  if (!error) {
    const actor = await getProfileLabel(authorId);
    const eventType = parentId ? 'comment_reply' : 'comment';
    const title = parentId ? 'Yorumuna yanıt' : 'Yeni yorum';
    await notifyPostAuthor(
      postId,
      authorId,
      eventType,
      title,
      `${actor}: ${content.trim().slice(0, 80)}`,
    );
  }

  return { error: error?.message ?? null };
}

export async function togglePostLike(
  postId: string,
  userId: string,
  isLiked: boolean,
): Promise<{ error: string | null }> {
  if (postId.startsWith('demo-')) return { error: null };

  if (isLiked) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });

  if (!error) {
    const actor = await getProfileLabel(userId);
    await notifyPostAuthor(postId, userId, 'like', 'Yeni beğeni', `${actor} gönderini beğendi`);
  }

  return { error: error?.message ?? null };
}

export async function togglePostSave(
  postId: string,
  userId: string,
  isSaved: boolean,
): Promise<{ error: string | null }> {
  if (postId.startsWith('demo-')) return { error: null };

  if (isSaved) {
    const { error } = await supabase
      .from('post_saves')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase.from('post_saves').insert({ post_id: postId, user_id: userId });

  if (!error) {
    const actor = await getProfileLabel(userId);
    await notifyPostAuthor(postId, userId, 'save', 'Kaydedildi', `${actor} gönderini kaydetti`);
  }

  return { error: error?.message ?? null };
}

export async function toggleCommentLike(
  commentId: string,
  userId: string,
  isLiked: boolean,
): Promise<{ error: string | null }> {
  if (commentId.startsWith('demo-')) return { error: null };

  if (isLiked) {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase
    .from('comment_likes')
    .insert({ comment_id: commentId, user_id: userId });
  return { error: error?.message ?? null };
}

export async function toggleFollow(
  followingId: string,
  followerId: string,
  isFollowing: boolean,
): Promise<{ error: string | null }> {
  if (followingId.startsWith('demo-')) return { error: null };

  if (isFollowing) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });

  if (!error) {
    const actor = await getProfileLabel(followerId);
    await notifyUser(
      followingId,
      'follow',
      'Yeni takipçi',
      `${actor} seni takip etmeye başladı`,
      followerId,
    );
  }

  return { error: error?.message ?? null };
}

export async function reportContent(
  reporterId: string,
  targetType: string,
  targetId: string,
  reason: ReportReason,
  details?: string,
): Promise<{ error: string | null }> {
  if (targetId.startsWith('demo-')) return { error: null };

  const { error } = await supabase.from('content_reports').insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason,
    details: details ?? null,
  });

  return { error: error?.message ?? null };
}

export async function blockUser(
  blockerId: string,
  blockedId: string,
  isRestricted = false,
): Promise<{ error: string | null }> {
  if (blockedId.startsWith('demo-')) return { error: null };

  const { error } = await supabase.from('user_blocks').upsert(
    { blocker_id: blockerId, blocked_id: blockedId, is_restricted: isRestricted },
    { onConflict: 'blocker_id,blocked_id' },
  );

  return { error: error?.message ?? null };
}

export async function unblockUser(
  blockerId: string,
  blockedId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  return { error: error?.message ?? null };
}

export async function createQuotePost(
  authorId: string,
  regionId: string,
  quotedPostId: string,
  content: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('posts').insert({
    author_id: authorId,
    region_id: regionId,
    content: content.trim(),
    post_type: 'quote',
    quoted_post_id: quotedPostId,
    category: 'general',
  });

  if (!error) {
    await supabase
      .from('posts')
      .select('quote_count')
      .eq('id', quotedPostId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (data) {
          await supabase
            .from('posts')
            .update({ quote_count: (data.quote_count ?? 0) + 1 })
            .eq('id', quotedPostId);
        }
      });

    const actor = await getProfileLabel(authorId);
    await notifyPostAuthor(
      quotedPostId,
      authorId,
      'quote',
      'Gönderin alıntılandı',
      `${actor}: ${content.trim().slice(0, 80)}`,
    );
  }

  return { error: error?.message ?? null };
}
