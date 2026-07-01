import { getOrCreateDirectConversation } from '@/features/messaging/services/conversationData';
import { sendMessage } from '@/features/messaging/services/messageData';

export async function sendStoryReply(input: {
  senderId: string;
  recipientId: string;
  storyItemId: string;
  storyThumbUrl: string | null;
  storyAuthorUsername: string;
  text: string;
}): Promise<{ error: string | null }> {
  const trimmed = input.text.trim();
  if (!trimmed) return { error: 'Mesaj boş olamaz' };

  const { conversationId, error: convError } = await getOrCreateDirectConversation(input.recipientId);
  if (convError || !conversationId) {
    return { error: convError ?? 'Sohbet açılamadı' };
  }

  const { error } = await sendMessage(conversationId, input.senderId, trimmed, {
    messageType: 'text',
    metadata: {
      type: 'story_reply',
      storyItemId: input.storyItemId,
      storyThumbUrl: input.storyThumbUrl,
      storyAuthorUsername: input.storyAuthorUsername,
    },
  });

  return { error };
}
