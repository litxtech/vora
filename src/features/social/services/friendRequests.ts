import { getProfileLabel, notifyUser } from '@/lib/notifications/helpers';
import { supabase } from '@/lib/supabase/client';

export async function sendFriendRequest(
  senderId: string,
  receiverId: string,
): Promise<{ error: string | null }> {
  if (senderId === receiverId) return { error: 'Kendinize istek gönderemezsiniz.' };

  const { error } = await supabase.from('friend_requests').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    status: 'pending',
  });

  if (!error) {
    const actor = await getProfileLabel(senderId);
    await notifyUser(
      receiverId,
      'friend_request',
      'Arkadaşlık isteği',
      `${actor} arkadaşlık isteği gönderdi`,
      senderId,
    );
  }

  return { error: error?.message ?? null };
}

export async function respondFriendRequest(
  requestId: string,
  receiverId: string,
  accept: boolean,
): Promise<{ error: string | null }> {
  const { data: request } = await supabase
    .from('friend_requests')
    .select('sender_id, receiver_id')
    .eq('id', requestId)
    .eq('receiver_id', receiverId)
    .maybeSingle();

  if (!request) return { error: 'İstek bulunamadı.' };

  const { error } = await supabase
    .from('friend_requests')
    .update({
      status: accept ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (!error && accept) {
    const actor = await getProfileLabel(receiverId);
    await notifyUser(
      request.sender_id,
      'friend_accepted',
      'İstek kabul edildi',
      `${actor} arkadaşlık isteğini kabul etti`,
      receiverId,
    );
  }

  return { error: error?.message ?? null };
}
