import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/** İstemciden tetiklenebilen sosyal bildirim türleri (outbox dışı). */
export const CLIENT_PUSH_EVENT_TYPES = new Set([
  'like',
  'save',
  'comment',
  'comment_reply',
  'quote',
  'share',
  'follow',
  'friend_accepted',
  'reel_like',
  'mention',
  'message',
  'group_message',
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ClientPushPayload = {
  recipientId: string;
  eventType: string;
  actorId?: string;
  data?: Record<string, unknown>;
};

function pickId(data: Record<string, unknown> | undefined, ...keys: string[]): string | null {
  if (!data) return null;
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && UUID_PATTERN.test(value)) return value;
  }
  return null;
}

async function hasRow(
  supabase: SupabaseClient,
  table: string,
  filters: Record<string, string>,
): Promise<boolean> {
  const columns = Object.keys(filters);
  if (!columns.length) return false;

  // Junction tablolarında (post_likes vb.) id yok; filtre sütunlarından birini seç.
  let query = supabase.from(table).select(columns[0]).limit(1);
  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value);
  }
  const { data, error } = await query.maybeSingle();
  return !error && data != null;
}

async function validatePostLikeOrSave(
  supabase: SupabaseClient,
  actorId: string,
  recipientId: string,
  postId: string,
  table: 'post_likes' | 'post_saves',
): Promise<boolean> {
  const { data: post } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .maybeSingle();
  if (!post?.author_id || post.author_id !== recipientId) return false;
  return hasRow(supabase, table, { post_id: postId, user_id: actorId });
}

async function validateReelLike(
  supabase: SupabaseClient,
  actorId: string,
  recipientId: string,
  reelId: string,
): Promise<boolean> {
  const { data: reel } = await supabase
    .from('reels')
    .select('author_id')
    .eq('id', reelId)
    .maybeSingle();
  if (!reel?.author_id || reel.author_id !== recipientId) return false;
  return hasRow(supabase, 'reel_likes', { reel_id: reelId, user_id: actorId });
}

async function validateFollow(
  supabase: SupabaseClient,
  actorId: string,
  recipientId: string,
  mutual: boolean,
): Promise<boolean> {
  const forward = await hasRow(supabase, 'follows', {
    follower_id: actorId,
    following_id: recipientId,
  });
  if (!forward) return false;
  if (!mutual) return true;
  return hasRow(supabase, 'follows', {
    follower_id: recipientId,
    following_id: actorId,
  });
}

async function validateQuote(
  supabase: SupabaseClient,
  actorId: string,
  recipientId: string,
  quotedPostId: string,
): Promise<boolean> {
  const { data: quoted } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', quotedPostId)
    .maybeSingle();
  if (!quoted?.author_id || quoted.author_id !== recipientId) return false;

  const { data: quotePost } = await supabase
    .from('posts')
    .select('id')
    .eq('author_id', actorId)
    .eq('quoted_post_id', quotedPostId)
    .limit(1)
    .maybeSingle();

  return !!quotePost;
}

async function validateShare(
  supabase: SupabaseClient,
  actorId: string,
  recipientId: string,
  data: Record<string, unknown> | undefined,
): Promise<boolean> {
  const postId = pickId(data, 'postId', 'post_id');
  const reelId = pickId(data, 'reelId', 'reel_id');

  if (postId) {
    const { data: post } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .maybeSingle();
    return post?.author_id === recipientId && actorId !== recipientId;
  }

  if (reelId) {
    const { data: reel } = await supabase
      .from('reels')
      .select('author_id')
      .eq('id', reelId)
      .maybeSingle();
    return reel?.author_id === recipientId && actorId !== recipientId;
  }

  return false;
}

async function validatePostComment(
  supabase: SupabaseClient,
  actorId: string,
  recipientId: string,
  eventType: string,
  data: Record<string, unknown> | undefined,
): Promise<boolean> {
  const postId = pickId(data, 'postId', 'post_id');
  if (!postId) return false;

  const { data: comment } = await supabase
    .from('post_comments')
    .select('id')
    .eq('post_id', postId)
    .eq('author_id', actorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!comment) return false;

  const { data: post } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .maybeSingle();
  if (!post?.author_id) return false;

  if (eventType === 'comment') {
    return recipientId === post.author_id && actorId !== recipientId;
  }

  const commentId = pickId(data, 'commentId', 'comment_id');
  if (commentId) {
    const { data: parent } = await supabase
      .from('post_comments')
      .select('author_id')
      .eq('id', commentId)
      .maybeSingle();
    if (parent?.author_id === recipientId) return true;
  }

  return post.author_id === recipientId && actorId !== recipientId;
}

async function validateReelComment(
  supabase: SupabaseClient,
  actorId: string,
  recipientId: string,
  eventType: string,
  data: Record<string, unknown> | undefined,
): Promise<boolean> {
  const reelId = pickId(data, 'reelId', 'reel_id');
  if (!reelId) return false;

  const { data: comment } = await supabase
    .from('reel_comments')
    .select('id')
    .eq('reel_id', reelId)
    .eq('author_id', actorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!comment) return false;

  const { data: reel } = await supabase
    .from('reels')
    .select('author_id')
    .eq('id', reelId)
    .maybeSingle();
  if (!reel?.author_id) return false;

  if (eventType === 'comment') {
    return recipientId === reel.author_id && actorId !== recipientId;
  }

  const commentId = pickId(data, 'commentId', 'comment_id');
  if (commentId) {
    const { data: parent } = await supabase
      .from('reel_comments')
      .select('author_id')
      .eq('id', commentId)
      .maybeSingle();
    if (parent?.author_id === recipientId) return true;
  }

  return reel.author_id === recipientId && actorId !== recipientId;
}

async function validateMessagePush(
  supabase: SupabaseClient,
  actorId: string,
  recipientId: string,
  data: Record<string, unknown> | undefined,
): Promise<boolean> {
  const messageId = pickId(data, 'messageId', 'message_id');
  const conversationId = pickId(data, 'conversationId', 'conversation_id');
  if (!messageId || !conversationId) return false;

  const { data: message } = await supabase
    .from('messages')
    .select('sender_id, conversation_id, message_type')
    .eq('id', messageId)
    .maybeSingle();

  if (!message || message.sender_id !== actorId || message.conversation_id !== conversationId) {
    return false;
  }

  if (message.message_type === 'call') return false;

  const { data: member } = await supabase
    .from('conversation_members')
    .select('user_id, muted_until')
    .eq('conversation_id', conversationId)
    .eq('user_id', recipientId)
    .maybeSingle();

  if (!member || member.user_id === actorId) return false;

  if (member.muted_until) {
    const mutedUntil = new Date(member.muted_until).getTime();
    if (!Number.isNaN(mutedUntil) && mutedUntil > Date.now()) return false;
  }

  return true;
}

async function validateMention(
  supabase: SupabaseClient,
  actorId: string,
  recipientId: string,
  data: Record<string, unknown> | undefined,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', recipientId)
    .maybeSingle();
  if (!profile?.username) return false;

  const needle = `@${profile.username}`;
  const postId = pickId(data, 'postId', 'post_id');
  const reelId = pickId(data, 'reelId', 'reel_id');

  if (postId) {
    const { data: comment } = await supabase
      .from('post_comments')
      .select('id')
      .eq('post_id', postId)
      .eq('author_id', actorId)
      .ilike('content', `%${needle}%`)
      .limit(1)
      .maybeSingle();
    if (comment) return true;
  }

  if (reelId) {
    const { data: comment } = await supabase
      .from('reel_comments')
      .select('id')
      .eq('reel_id', reelId)
      .eq('author_id', actorId)
      .ilike('content', `%${needle}%`)
      .limit(1)
      .maybeSingle();
    if (comment) return true;
  }

  return false;
}

export async function authorizeClientPush(
  supabase: SupabaseClient,
  actorId: string,
  payload: ClientPushPayload,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { recipientId, eventType, data } = payload;

  if (!UUID_PATTERN.test(recipientId)) {
    return { ok: false, status: 400, error: 'Invalid recipientId' };
  }

  if (!CLIENT_PUSH_EVENT_TYPES.has(eventType)) {
    return { ok: false, status: 403, error: 'Event type not allowed from client' };
  }

  if (recipientId === actorId) {
    return { ok: false, status: 400, error: 'Self notification' };
  }

  let authorized = false;

  switch (eventType) {
    case 'like': {
      const postId = pickId(data, 'postId', 'post_id');
      if (postId) {
        authorized = await validatePostLikeOrSave(supabase, actorId, recipientId, postId, 'post_likes');
      }
      break;
    }
    case 'save': {
      const postId = pickId(data, 'postId', 'post_id');
      if (postId) {
        authorized = await validatePostLikeOrSave(supabase, actorId, recipientId, postId, 'post_saves');
      }
      break;
    }
    case 'reel_like': {
      const reelId = pickId(data, 'reelId', 'reel_id');
      if (reelId) authorized = await validateReelLike(supabase, actorId, recipientId, reelId);
      break;
    }
    case 'follow':
      authorized = await validateFollow(supabase, actorId, recipientId, false);
      break;
    case 'friend_accepted':
      authorized = await validateFollow(supabase, actorId, recipientId, true);
      break;
    case 'quote': {
      const postId = pickId(data, 'postId', 'post_id');
      if (postId) authorized = await validateQuote(supabase, actorId, recipientId, postId);
      break;
    }
    case 'share':
      authorized = await validateShare(supabase, actorId, recipientId, data);
      break;
    case 'comment':
    case 'comment_reply': {
      const postId = pickId(data, 'postId', 'post_id');
      const reelId = pickId(data, 'reelId', 'reel_id');
      if (postId) {
        authorized = await validatePostComment(supabase, actorId, recipientId, eventType, data);
      } else if (reelId) {
        authorized = await validateReelComment(supabase, actorId, recipientId, eventType, data);
      }
      break;
    }
    case 'mention':
      authorized = await validateMention(supabase, actorId, recipientId, data);
      break;
    case 'message':
    case 'group_message':
      authorized = await validateMessagePush(supabase, actorId, recipientId, data);
      break;
  }

  if (!authorized) {
    return { ok: false, status: 403, error: 'Notification not authorized' };
  }

  return { ok: true };
}
