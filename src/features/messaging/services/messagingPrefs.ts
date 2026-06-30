import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type MessagingPrivacyLevel = 'everyone' | 'friends' | 'nobody';

export type MessagingPrefs = {
  who_can_message: MessagingPrivacyLevel;
  who_can_call: MessagingPrivacyLevel;
  hide_notification_preview: boolean;
};

const DEFAULT_PREFS: MessagingPrefs = {
  who_can_message: 'everyone',
  who_can_call: 'everyone',
  hide_notification_preview: false,
};

export async function fetchMessagingPrefs(userId: string): Promise<MessagingPrefs> {
  const { data, error } = await supabase
    .from('profiles')
    .select('messaging_prefs')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  const raw = (data?.messaging_prefs ?? {}) as Partial<MessagingPrefs>;
  return { ...DEFAULT_PREFS, ...raw };
}

export async function updateMessagingPrefs(
  userId: string,
  updates: Partial<MessagingPrefs>,
): Promise<{ error: string | null }> {
  const existing = await fetchMessagingPrefs(userId);
  const merged = { ...existing, ...updates };

  const { error } = await supabase
    .from('profiles')
    .update({ messaging_prefs: merged, updated_at: new Date().toISOString() })
    .eq('id', userId);

  return { error: supabaseErrorMessage(error) };
}

export async function canCallUser(recipientId: string, senderId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_user_call_me', {
    p_recipient_id: recipientId,
    p_sender_id: senderId,
  });
  if (error) return true;
  return Boolean(data);
}
