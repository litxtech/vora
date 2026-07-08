import { sanitizeAvatarUrl } from '@/features/account-deletion/utils';
import { supabase } from '@/lib/supabase/client';

export type StoryReactionRow = {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  emoji: string;
  createdAt: string;
};

export type StoryReplyRow = {
  messageId: string;
  senderId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
};

export type StoryItemEngagement = {
  reactions: StoryReactionRow[];
  replies: StoryReplyRow[];
};

export async function fetchStoryItemEngagement(
  authorId: string,
  storyItemId: string,
): Promise<StoryItemEngagement> {
  const empty: StoryItemEngagement = { reactions: [], replies: [] };

  const { data, error } = await supabase.rpc('get_story_item_engagement', {
    p_author_id: authorId,
    p_story_item_id: storyItemId,
  });

  if (error) {
    console.warn('[stories] fetchStoryItemEngagement failed:', error.message);
    return empty;
  }

  const payload = (data ?? {}) as {
    reactions?: Array<Record<string, unknown>>;
    replies?: Array<Record<string, unknown>>;
  };

  const reactions: StoryReactionRow[] = (payload.reactions ?? []).map((row) => ({
    userId: String(row.userId ?? ''),
    username: String(row.username ?? ''),
    fullName: (row.fullName as string | null) ?? null,
    avatarUrl: sanitizeAvatarUrl((row.avatarUrl as string | null) ?? null, 'active'),
    emoji: String(row.emoji ?? '❤️'),
    createdAt: String(row.createdAt ?? ''),
  }));

  const replies: StoryReplyRow[] = (payload.replies ?? []).map((row) => ({
    messageId: String(row.messageId ?? ''),
    senderId: String(row.senderId ?? ''),
    username: String(row.username ?? ''),
    fullName: (row.fullName as string | null) ?? null,
    avatarUrl: sanitizeAvatarUrl((row.avatarUrl as string | null) ?? null, 'active'),
    content: String(row.content ?? ''),
    createdAt: String(row.createdAt ?? ''),
  }));

  return { reactions, replies };
}
