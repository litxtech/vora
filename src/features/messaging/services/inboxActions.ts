import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type MuteDuration = '1h' | '8h' | '1d' | '1w' | 'forever';

const MUTE_MINUTES: Record<Exclude<MuteDuration, 'forever'>, number> = {
  '1h': 60,
  '8h': 480,
  '1d': 1440,
  '1w': 10080,
};

export async function pinConversation(conversationId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('pin_conversation', { p_conversation_id: conversationId });
  return { error: supabaseErrorMessage(error) };
}

export async function unpinConversation(conversationId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('unpin_conversation', { p_conversation_id: conversationId });
  return { error: supabaseErrorMessage(error) };
}

export async function archiveConversation(conversationId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('archive_conversation', { p_conversation_id: conversationId });
  return { error: supabaseErrorMessage(error) };
}

export async function unarchiveConversation(conversationId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('unarchive_conversation', { p_conversation_id: conversationId });
  return { error: supabaseErrorMessage(error) };
}

export async function muteConversation(
  conversationId: string,
  duration: MuteDuration,
): Promise<{ error: string | null }> {
  const minutes = duration === 'forever' ? null : MUTE_MINUTES[duration];
  const { error } = await supabase.rpc('mute_conversation', {
    p_conversation_id: conversationId,
    p_duration_minutes: minutes,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function unmuteConversation(conversationId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('unmute_conversation', { p_conversation_id: conversationId });
  return { error: supabaseErrorMessage(error) };
}

export async function clearConversationHistory(
  conversationId: string,
): Promise<{ cleared: number; error: string | null }> {
  const { data, error } = await supabase.rpc('clear_conversation_history', {
    p_conversation_id: conversationId,
  });
  if (error) return { cleared: 0, error: supabaseErrorMessage(error)! };
  return { cleared: Number(data ?? 0), error: null };
}

export async function showConversation(conversationId: string): Promise<void> {
  await supabase.rpc('show_conversation', { p_conversation_id: conversationId });
}

export async function deleteConversationForUser(
  conversationId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('delete_conversation_for_user', {
    p_conversation_id: conversationId,
  });
  return { error: supabaseErrorMessage(error) };
}

export const MUTE_OPTIONS: { id: MuteDuration; label: string }[] = [
  { id: '1h', label: '1 Saat' },
  { id: '8h', label: '8 Saat' },
  { id: '1d', label: '1 Gün' },
  { id: '1w', label: '1 Hafta' },
  { id: 'forever', label: 'Sonsuz' },
];
