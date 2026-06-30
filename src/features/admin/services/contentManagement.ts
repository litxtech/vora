import { supabase } from '@/lib/supabase/client';
import type { ContentStatus } from '@/types/database';
import { supabaseErrorMessage } from '@/lib/errors';

export type AdminContentTab = 'posts' | 'reels' | 'comments';
export type AdminContentStatusFilter = 'all' | AdminContentStatusFilterValue;
type AdminContentStatusFilterValue = 'published' | 'hidden' | 'removed';

export type AdminAuthorSnippet = {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type AdminPostRow = {
  id: string;
  title: string | null;
  content: string;
  media_urls: string[];
  status: ContentStatus;
  author_id: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  post_type: string | null;
  category: string | null;
  author: AdminAuthorSnippet | null;
};

export type AdminReelRow = {
  id: string;
  caption: string | null;
  status: ContentStatus;
  author_id: string;
  view_count: number;
  like_count: number;
  created_at: string;
  author: AdminAuthorSnippet | null;
  video: {
    thumbnail_url: string | null;
    mux_playback_id: string | null;
  } | null;
};

export type AdminCommentRow = {
  id: string;
  content: string;
  author_id: string;
  post_id: string;
  like_count: number;
  created_at: string;
  author: AdminAuthorSnippet | null;
  post: {
    title: string | null;
    content: string;
    media_urls: string[];
  } | null;
};

function mapAuthor(raw: AdminAuthorSnippet | AdminAuthorSnippet[] | null): AdminAuthorSnippet | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

function applyStatusFilter<T extends { eq: (col: string, val: string) => T }>(
  query: T,
  status: AdminContentStatusFilter,
): T {
  if (status === 'all') return query;
  return query.eq('status', status);
}

export async function fetchAdminPosts(
  limit = 50,
  status: AdminContentStatusFilter = 'all',
  search = '',
): Promise<{ data: AdminPostRow[]; error: string | null }> {
  let query = supabase
    .from('posts')
    .select(
      `id, title, content, media_urls, status, author_id, view_count, like_count, comment_count,
       created_at, post_type, category,
       author:profiles!posts_author_id_fkey (username, full_name, avatar_url)`,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  query = applyStatusFilter(query, status);

  const q = search.trim();
  if (q) {
    query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: supabaseErrorMessage(error)! };

  const rows = (data ?? []).map((row) => ({
    ...(row as Omit<AdminPostRow, 'author'>),
    author: mapAuthor((row as { author: AdminAuthorSnippet | AdminAuthorSnippet[] | null }).author),
  }));

  return { data: rows, error: null };
}

export async function fetchAdminReels(
  limit = 50,
  status: AdminContentStatusFilter = 'all',
  search = '',
): Promise<{ data: AdminReelRow[]; error: string | null }> {
  let query = supabase
    .from('reels')
    .select(
      `id, caption, status, author_id, view_count, like_count, created_at,
       author:profiles!reels_author_id_fkey (username, full_name, avatar_url),
       video:videos (thumbnail_url, mux_playback_id)`,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  query = applyStatusFilter(query, status);

  const q = search.trim();
  if (q) {
    query = query.ilike('caption', `%${q}%`);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: supabaseErrorMessage(error)! };

  const rows = (data ?? []).map((row) => {
    const videoRaw = (row as { video: AdminReelRow['video'] | AdminReelRow['video'][] }).video;
    const video = Array.isArray(videoRaw) ? videoRaw[0] ?? null : videoRaw;
    return {
      ...(row as Omit<AdminReelRow, 'author' | 'video'>),
      author: mapAuthor((row as { author: AdminAuthorSnippet | AdminAuthorSnippet[] | null }).author),
      video,
    };
  });

  return { data: rows, error: null };
}

export async function fetchAdminComments(
  limit = 50,
  search = '',
): Promise<{ data: AdminCommentRow[]; error: string | null }> {
  let query = supabase
    .from('post_comments')
    .select(
      `id, content, author_id, post_id, like_count, created_at,
       author:profiles!post_comments_author_id_fkey (username, full_name, avatar_url),
       post:posts (title, content, media_urls)`,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  const q = search.trim();
  if (q) {
    query = query.ilike('content', `%${q}%`);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: supabaseErrorMessage(error)! };

  const rows = (data ?? []).map((row) => {
    const postRaw = (row as { post: AdminCommentRow['post'] | AdminCommentRow['post'][] }).post;
    const post = Array.isArray(postRaw) ? postRaw[0] ?? null : postRaw;
    return {
      ...(row as Omit<AdminCommentRow, 'author' | 'post'>),
      author: mapAuthor((row as { author: AdminAuthorSnippet | AdminAuthorSnippet[] | null }).author),
      post,
    };
  });

  return { data: rows, error: null };
}

export async function updatePostStatus(postId: string, status: ContentStatus) {
  const { error } = await supabase.from('posts').update({ status }).eq('id', postId);
  return { error: supabaseErrorMessage(error) };
}

export async function updateReelStatus(reelId: string, status: ContentStatus) {
  const { error } = await supabase.from('reels').update({ status }).eq('id', reelId);
  return { error: supabaseErrorMessage(error) };
}

export type ContentWarningResult = {
  warning_id: string;
  strike: number;
  max_strikes: number;
  title: string;
  body: string;
};

export async function issueContentWarning(
  targetType: 'post' | 'reel' | 'comment',
  targetId: string,
  reason = 'Admin içerik yönetimi',
): Promise<{ data: ContentWarningResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_issue_content_warning', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
  });
  if (error) return { data: null, error: supabaseErrorMessage(error)! };
  return { data: data as ContentWarningResult, error: null };
}

export async function moderateContent(
  moderatorId: string,
  targetType: string,
  targetId: string,
  action: 'warn' | 'hide' | 'remove',
  reason: string,
) {
  if (action === 'warn') {
    const result = await issueContentWarning(
      targetType as 'post' | 'reel' | 'comment',
      targetId,
      reason,
    );
    return { error: result.error, warning: result.data };
  }

  const statusMap: Record<string, ContentStatus> = {
    hide: 'hidden',
    remove: 'removed',
  };

  if (targetType === 'post' && statusMap[action]) {
    await supabase.from('posts').update({ status: statusMap[action] }).eq('id', targetId);
  } else if (targetType === 'reel' && statusMap[action]) {
    await supabase.from('reels').update({ status: statusMap[action] }).eq('id', targetId);
  }

  const { error } = await supabase.from('moderation_actions').insert({
    moderator_id: moderatorId,
    target_type: targetType,
    target_id: targetId,
    action,
    reason,
  });

  return { error: supabaseErrorMessage(error), warning: null };
}
