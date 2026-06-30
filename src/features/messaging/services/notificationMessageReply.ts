import { supabase } from '@/lib/supabase/client';
import { sendMessage } from './messageData';

/** Bildirimden (kilit ekranı / banner) uygulamayı açmadan metin yanıtı gönderir. */
export async function sendMessageFromNotificationReply(
  conversationId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = text.trim();
  if (!trimmed || !conversationId) return { ok: false, error: 'empty' };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'not_authenticated' };

  const { error } = await sendMessage(conversationId, userId, trimmed);
  if (error) return { ok: false, error };
  return { ok: true };
}
