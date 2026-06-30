import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export const REACTION_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢'] as const;

export type MessageReaction = {
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
  user?: { username: string; full_name: string | null };
};

export async function fetchMessageReactions(
  messageIds: string[],
): Promise<Record<string, MessageReaction[]>> {
  if (messageIds.length === 0) return {};

  const { data, error } = await supabase
    .from('message_reactions')
    .select('message_id, user_id, emoji, created_at, user:user_id (username, full_name)')
    .in('message_id', messageIds);

  if (error) throw error;

  const map: Record<string, MessageReaction[]> = {};
  for (const row of data ?? []) {
    const r = row as {
      message_id: string;
      user_id: string;
      emoji: string;
      created_at: string;
      user?: { username: string; full_name: string | null };
    };
    const item: MessageReaction = {
      messageId: r.message_id,
      userId: r.user_id,
      emoji: r.emoji,
      createdAt: r.created_at,
      user: r.user,
    };
    if (!map[r.message_id]) map[r.message_id] = [];
    map[r.message_id].push(item);
  }
  return map;
}

export async function toggleReaction(
  messageId: string,
  emoji: string,
): Promise<{ added: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc('toggle_message_reaction', {
    p_message_id: messageId,
    p_emoji: emoji,
  });

  if (error) return { added: false, error: supabaseErrorMessage(error)! };
  return { added: Boolean(data), error: null };
}
