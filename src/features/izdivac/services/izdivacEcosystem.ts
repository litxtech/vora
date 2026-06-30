import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type {
  IzdivacConversationItem,
  IzdivacInviteMeta,
  IzdivacPost,
  IzdivacPostComment,
  IzdivacPostKind,
  IzdivacProfile,
  IzdivacSpace,
  IzdivacSpaceAudience,
  IzdivacSpaceType,
} from '@/features/izdivac/types';

const VALID_SPECIAL_BADGES = ['jigolo', 'tilki', 'finansman'] as const;

function normalizeIzdivacBadges(raw: unknown): IzdivacPost['authorSpecialBadges'] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((b): b is IzdivacPost['authorSpecialBadges'][number] =>
    (VALID_SPECIAL_BADGES as readonly string[]).includes(b),
  );
}

function parseInviteMeta(raw: unknown): IzdivacInviteMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    when: typeof o.when === 'string' ? o.when : null,
    where: typeof o.where === 'string' ? o.where : null,
    activity: typeof o.activity === 'string' ? o.activity : null,
  };
}

export async function deleteIzdivacPost(postId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('izdivac_delete_post', { p_post_id: postId });
  return { error: supabaseErrorMessage(error) };
}

export async function fetchIzdivacProfile(userId?: string): Promise<IzdivacProfile | null> {
  const { data, error } = await supabase.rpc('izdivac_get_profile', {
    p_user_id: userId ?? undefined,
  });
  if (error || !data?.length) return null;
  const row = data[0] as {
    user_id: string;
    headline: string | null;
    looking_for: string | null;
    about_me: string | null;
    show_on_wall: boolean;
  };
  return {
    userId: row.user_id,
    headline: row.headline,
    lookingFor: row.looking_for,
    aboutMe: row.about_me,
    showOnWall: row.show_on_wall,
  };
}

export async function upsertIzdivacProfile(input: {
  headline?: string | null;
  lookingFor?: string | null;
  aboutMe?: string | null;
  showOnWall?: boolean;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('izdivac_upsert_profile', {
    p_headline: input.headline ?? null,
    p_looking_for: input.lookingFor ?? null,
    p_about_me: input.aboutMe ?? null,
    p_show_on_wall: input.showOnWall ?? true,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function createIzdivacPost(input: {
  body: string;
  kind?: IzdivacPostKind;
  mediaUrls?: string[];
  inviteMeta?: IzdivacInviteMeta | null;
  openSpace?: boolean;
}): Promise<{ postId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('izdivac_create_post', {
    p_body: input.body,
    p_kind: input.kind ?? 'share',
    p_media_urls: input.mediaUrls ?? [],
    p_invite_meta: input.inviteMeta ?? null,
    p_open_space: input.openSpace ?? false,
  });
  return { postId: (data as string) ?? null, error: supabaseErrorMessage(error) };
}

export async function fetchIzdivacPosts(cursor?: string | null): Promise<{
  posts: IzdivacPost[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('izdivac_list_posts', {
    p_limit: 40,
    p_cursor: cursor ?? null,
  });
  if (error) return { posts: [], error: supabaseErrorMessage(error) };

  const posts = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    postId: String(row.post_id),
    authorId: String(row.author_id),
    authorFirstName: String(row.author_first_name ?? 'Üye'),
    authorLastName: (row.author_last_name as string | null) ?? null,
    authorAvatarUrl: (row.author_avatar_url as string | null) ?? null,
    kind: row.kind as IzdivacPostKind,
    body: String(row.body ?? ''),
    mediaUrls: Array.isArray(row.media_urls) ? (row.media_urls as string[]) : [],
    inviteMeta: parseInviteMeta(row.invite_meta),
    spaceId: (row.space_id as string | null) ?? null,
    likeCount: Number(row.like_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    joinCount: Number(row.join_count ?? 0),
    likedByMe: Boolean(row.liked_by_me),
    joinedByMe: Boolean(row.joined_by_me),
    createdAt: String(row.created_at),
    authorSpecialBadges: normalizeIzdivacBadges(row.author_special_badges),
  }));

  return { posts, error: null };
}

export async function toggleIzdivacPostLike(postId: string): Promise<{
  liked: boolean;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('izdivac_toggle_post_like', { p_post_id: postId });
  return { liked: Boolean(data), error: supabaseErrorMessage(error) };
}

export async function addIzdivacPostComment(
  postId: string,
  body: string,
  parentCommentId?: string | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('izdivac_add_post_comment', {
    p_post_id: postId,
    p_body: body,
    p_parent_comment_id: parentCommentId ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function editIzdivacPostComment(
  commentId: string,
  body: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('izdivac_edit_post_comment', {
    p_comment_id: commentId,
    p_body: body,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function deleteIzdivacPostComment(
  commentId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('izdivac_delete_post_comment', {
    p_comment_id: commentId,
  });
  return { error: supabaseErrorMessage(error) };
}

function nestIzdivacComments(flat: IzdivacPostComment[]): IzdivacPostComment[] {
  const byId = new Map<string, IzdivacPostComment>();
  for (const comment of flat) {
    comment.replies = [];
    byId.set(comment.commentId, comment);
  }

  const roots: IzdivacPostComment[] = [];
  for (const comment of flat) {
    if (comment.parentCommentId && byId.has(comment.parentCommentId)) {
      byId.get(comment.parentCommentId)!.replies!.push(comment);
    } else {
      roots.push(comment);
    }
  }
  return roots;
}

export async function fetchIzdivacPostComments(postId: string): Promise<{
  comments: IzdivacPostComment[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('izdivac_list_post_comments', { p_post_id: postId });
  if (error) return { comments: [], error: supabaseErrorMessage(error) };

  const flat = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    commentId: String(row.comment_id),
    parentCommentId: (row.parent_comment_id as string | null) ?? null,
    authorId: String(row.author_id),
    authorFirstName: String(row.author_first_name ?? 'Üye'),
    authorAvatarUrl: (row.author_avatar_url as string | null) ?? null,
    body: String(row.body ?? ''),
    isEdited: Boolean(row.is_edited),
    createdAt: String(row.created_at),
    replies: [] as IzdivacPostComment[],
  }));

  return { comments: nestIzdivacComments(flat), error: null };
}

export async function joinIzdivacPost(postId: string): Promise<{
  spaceId: string | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('izdivac_join_post', { p_post_id: postId });
  return { spaceId: (data as string | null) ?? null, error: supabaseErrorMessage(error) };
}

export async function createIzdivacSpace(input: {
  title: string;
  description?: string | null;
  spaceType?: IzdivacSpaceType;
  audience?: IzdivacSpaceAudience;
}): Promise<{ spaceId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('izdivac_create_space', {
    p_title: input.title,
    p_description: input.description ?? null,
    p_space_type: input.spaceType ?? 'open',
    p_audience: input.audience ?? 'all_members',
  });
  return { spaceId: (data as string) ?? null, error: supabaseErrorMessage(error) };
}

export async function fetchIzdivacSpaces(): Promise<{
  spaces: IzdivacSpace[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('izdivac_list_spaces', { p_limit: 50 });
  if (error) return { spaces: [], error: supabaseErrorMessage(error) };

  const spaces = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    spaceId: String(row.space_id),
    conversationId: String(row.conversation_id),
    title: String(row.title ?? ''),
    description: (row.description as string | null) ?? null,
    spaceType: row.space_type as IzdivacSpaceType,
    audience: row.audience as IzdivacSpaceAudience,
    memberCount: Number(row.member_count ?? 0),
    createdBy: String(row.created_by),
    creatorFirstName: String(row.creator_first_name ?? 'Üye'),
    creatorAvatarUrl: (row.creator_avatar_url as string | null) ?? null,
    linkedPostId: (row.linked_post_id as string | null) ?? null,
    isMember: Boolean(row.is_member),
    lastActivityAt: String(row.last_activity_at),
  }));

  return { spaces, error: null };
}

export async function joinIzdivacSpace(spaceId: string): Promise<{
  conversationId: string | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('izdivac_join_space', { p_space_id: spaceId });
  return { conversationId: (data as string) ?? null, error: supabaseErrorMessage(error) };
}

export async function startIzdivacDirectChat(otherUserId: string): Promise<{
  conversationId: string | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('izdivac_start_direct_chat', {
    p_other_user_id: otherUserId,
  });
  return { conversationId: (data as string) ?? null, error: supabaseErrorMessage(error) };
}

export async function fetchIzdivacConversations(): Promise<{
  conversations: IzdivacConversationItem[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('izdivac_list_conversations');
  if (error) return { conversations: [], error: supabaseErrorMessage(error) };

  const conversations = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    conversationId: String(row.conversation_id),
    conversationType: row.conversation_type as 'direct' | 'group',
    title: (row.title as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    lastMessageAt: (row.last_message_at as string | null) ?? null,
    lastMessagePreview: (row.last_message_preview as string | null) ?? null,
    otherUserId: (row.other_user_id as string | null) ?? null,
    otherUsername: (row.other_username as string | null) ?? null,
    otherFullName: (row.other_full_name as string | null) ?? null,
    otherAvatarUrl: (row.other_avatar_url as string | null) ?? null,
    unreadCount: Number(row.unread_count ?? 0),
    memberCount: Number(row.member_count ?? 0),
    linkType: row.link_type as 'direct' | 'space',
    spaceId: (row.space_id as string | null) ?? null,
  }));

  return { conversations, error: null };
}
