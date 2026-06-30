import { supabase } from '@/lib/supabase/client';
import type { ChatMessage } from '../types';

const PROFILE_SELECT = 'id, username, full_name, avatar_url, account_status';
const REPLY_SELECT = `
  id, content, sender_id, message_type,
  sender:sender_id (id, username, full_name, avatar_url, account_status)
`;
const FORWARD_SELECT = `
  id, content, sender_id, message_type,
  sender:sender_id (id, username, full_name, avatar_url, account_status)
`;

/** Eksik gönderen / alıntı / iletilen bilgisini tek seferde tamamlar. */
export async function fetchMessageHydration(
  message: ChatMessage,
): Promise<Partial<ChatMessage>> {
  const patch: Partial<ChatMessage> = {};

  await Promise.all([
    !message.sender
      ? supabase
          .from('profiles')
          .select(PROFILE_SELECT)
          .eq('id', message.senderId)
          .maybeSingle()
          .then(({ data }) => {
            if (data) patch.sender = data;
          })
      : Promise.resolve(),
    message.replyToId && !message.replyTo
      ? supabase
          .from('messages')
          .select(REPLY_SELECT)
          .eq('id', message.replyToId)
          .maybeSingle()
          .then(({ data }) => {
            if (data) patch.replyTo = data as ChatMessage['replyTo'];
          })
      : Promise.resolve(),
    message.forwardedFromId && !message.forwardedFrom
      ? supabase
          .from('messages')
          .select(FORWARD_SELECT)
          .eq('id', message.forwardedFromId)
          .maybeSingle()
          .then(({ data }) => {
            if (data) patch.forwardedFrom = data as ChatMessage['forwardedFrom'];
          })
      : Promise.resolve(),
  ]);

  return patch;
}
