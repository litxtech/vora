import { sendNotification } from '@/lib/notifications/dispatch';
import { buildNotificationData } from '@/lib/notifications/notificationPayload';
import type { NotificationEventType } from '@/constants/notifications';
import { getMuxThumbnailUrl } from '@/lib/mux/client';
import { supabase } from '@/lib/supabase/client';

type VideoThumbRow = {
  thumbnail_url: string | null;
  mux_playback_id: string | null;
};

function firstMediaUrl(mediaUrls: string[] | null | undefined): string | null {
  const url = mediaUrls?.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
  return url?.trim() ?? null;
}

function resolveVideoThumbnail(video: VideoThumbRow | null | undefined): string | null {
  if (!video) return null;
  if (video.thumbnail_url?.trim()) return video.thumbnail_url.trim();
  if (video.mux_playback_id?.trim()) return getMuxThumbnailUrl(video.mux_playback_id.trim());
  return null;
}

async function buildPostNotificationMedia(postId: string): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from('posts')
    .select('content, media_urls, videos(thumbnail_url, mux_playback_id)')
    .eq('id', postId)
    .maybeSingle();

  if (!data) return {};

  const video = Array.isArray(data.videos)
    ? (data.videos[0] as VideoThumbRow | undefined)
    : (data.videos as VideoThumbRow | null);
  const thumbnail = firstMediaUrl(data.media_urls) ?? resolveVideoThumbnail(video);

  const result: Record<string, unknown> = {};
  if (thumbnail) {
    result.content_image_url = thumbnail;
    result.thumbnail_url = thumbnail;
  }

  const preview = typeof data.content === 'string' ? data.content.trim() : '';
  if (preview) result.post_preview = preview.slice(0, 120);

  return result;
}

async function buildReelNotificationMedia(reelId: string): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from('reels')
    .select('caption, videos(thumbnail_url, mux_playback_id)')
    .eq('id', reelId)
    .maybeSingle();

  if (!data) return {};

  const video = Array.isArray(data.videos)
    ? (data.videos[0] as VideoThumbRow | undefined)
    : (data.videos as VideoThumbRow | null);
  const thumbnail = resolveVideoThumbnail(video);

  const result: Record<string, unknown> = {};
  if (thumbnail) {
    result.content_image_url = thumbnail;
    result.thumbnail_url = thumbnail;
  }

  const preview = typeof data.caption === 'string' ? data.caption.trim() : '';
  if (preview) result.post_preview = preview.slice(0, 120);

  return result;
}

async function enrichNotificationMedia(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const postId =
    typeof data.postId === 'string' ? data.postId : typeof data.post_id === 'string' ? data.post_id : null;
  const reelId =
    typeof data.reelId === 'string' ? data.reelId : typeof data.reel_id === 'string' ? data.reel_id : null;

  const hasContent =
    typeof data.content_image_url === 'string' ||
    typeof data.contentImageUrl === 'string' ||
    typeof data.thumbnail_url === 'string' ||
    typeof data.thumbnailUrl === 'string';

  if (hasContent) return data;
  if (postId) return { ...data, ...(await buildPostNotificationMedia(postId)) };
  if (reelId) return { ...data, ...(await buildReelNotificationMedia(reelId)) };
  return data;
}

export async function getProfileLabel(userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('username, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (!data) return 'Birisi';
  return data.full_name ?? `@${data.username}`;
}

export async function notifyUser(
  recipientId: string,
  eventType: NotificationEventType,
  title: string,
  body: string,
  actorId?: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (recipientId === actorId) return;
  const enrichedData = buildNotificationData(await enrichNotificationMedia(data ?? {}));
  await sendNotification({
    recipientId,
    eventType,
    title,
    body,
    actorId,
    data: enrichedData,
  });
}

export async function notifyPostAuthor(
  postId: string,
  actorId: string,
  eventType: NotificationEventType,
  title: string,
  body: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  const { data: post } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .maybeSingle();

  if (!post?.author_id) return;
  await notifyUser(
    post.author_id,
    eventType,
    title,
    body,
    actorId,
    buildNotificationData({ postId, ...extra }),
  );
}

export async function notifyCommentReplyTargets(
  postId: string,
  actorId: string,
  parentId: string | null | undefined,
  preview: string,
): Promise<void> {
  const actor = await getProfileLabel(actorId);

  const { data: post } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .maybeSingle();

  let parentAuthorId: string | null = null;
  if (parentId) {
    const { data: parent } = await supabase
      .from('post_comments')
      .select('author_id')
      .eq('id', parentId)
      .maybeSingle();
    parentAuthorId = parent?.author_id ?? null;

    if (parentAuthorId && parentAuthorId !== actorId) {
      await notifyUser(
        parentAuthorId,
        'comment_reply',
        'Yorumuna yanıt',
        `${actor}: ${preview.slice(0, 80)}`,
        actorId,
        buildNotificationData({ postId, commentId: parentId, comment_preview: preview.slice(0, 120) }),
      );
    }
  }

  const postAuthorId = post?.author_id;
  if (!postAuthorId || postAuthorId === actorId) return;
  if (parentAuthorId && postAuthorId === parentAuthorId) return;

  await notifyUser(
    postAuthorId,
    parentId ? 'comment_reply' : 'comment',
    parentId ? 'Gönderine yanıt' : 'Yeni yorum',
    `${actor}: ${preview.slice(0, 80)}`,
    actorId,
    buildNotificationData({
      postId,
      ...(parentId ? { commentId: parentId } : {}),
      comment_preview: preview.slice(0, 120),
    }),
  );
}

export async function notifyReelCommentTargets(
  reelId: string,
  actorId: string,
  parentId: string | null | undefined,
  preview: string,
): Promise<void> {
  const actor = await getProfileLabel(actorId);
  const { data: reel } = await supabase
    .from('reels')
    .select('author_id')
    .eq('id', reelId)
    .maybeSingle();

  let parentAuthorId: string | null = null;
  if (parentId) {
    const { data: parent } = await supabase
      .from('reel_comments')
      .select('author_id')
      .eq('id', parentId)
      .maybeSingle();
    parentAuthorId = parent?.author_id ?? null;

    if (parentAuthorId && parentAuthorId !== actorId) {
      await notifyUser(
        parentAuthorId,
        'comment_reply',
        'Reel yorumuna yanıt',
        `${actor}: ${preview.slice(0, 80)}`,
        actorId,
        buildNotificationData({ reelId, commentId: parentId }),
      );
    }
  }

  const reelAuthorId = reel?.author_id;
  if (!reelAuthorId || reelAuthorId === actorId) return;
  if (parentAuthorId && reelAuthorId === parentAuthorId) return;

  await notifyUser(
    reelAuthorId,
    parentId ? 'comment_reply' : 'comment',
    parentId ? 'Reeline yanıt' : 'Yeni reel yorumu',
    `${actor}: ${preview.slice(0, 80)}`,
    actorId,
    buildNotificationData({ reelId }),
  );
}

export async function notifyShareTarget(
  authorId: string,
  actorId: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  await notifyUser(authorId, 'share', title, body, actorId, buildNotificationData(data));
}
