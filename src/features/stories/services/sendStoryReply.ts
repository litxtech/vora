import { getOrCreateDirectConversation } from '@/features/messaging/services/conversationData';
import { sendMessage } from '@/features/messaging/services/messageData';
import { resolveStoryMediaUrl, resolveStoryThumbUrl } from '@/features/stories/services/storyMediaUrl';

export async function sendStoryReply(input: {
  senderId: string;
  recipientId: string;
  storyItemId: string;
  storyThumbUrl: string | null;
  storyMediaUrl: string;
  storyMediaType: 'image' | 'video';
  storyAuthorUsername: string;
  storyAuthorId: string;
  text: string;
}): Promise<{ error: string | null }> {
  const trimmed = input.text.trim();
  if (!trimmed) return { error: 'Mesaj boş olamaz' };

  const { conversationId, error: convError } = await getOrCreateDirectConversation(input.recipientId);
  if (convError || !conversationId) {
    return { error: convError ?? 'Sohbet açılamadı' };
  }

  const thumb = resolveStoryThumbUrl(input.storyThumbUrl, input.storyMediaUrl);
  const mediaUrl = resolveStoryMediaUrl(input.storyMediaUrl) ?? input.storyMediaUrl;

  const { error } = await sendMessage(conversationId, input.senderId, trimmed, {
    messageType: 'text',
    metadata: {
      type: 'story_reply',
      storyItemId: input.storyItemId,
      storyThumbUrl: thumb,
      storyMediaUrl: mediaUrl,
      storyMediaType: input.storyMediaType,
      storyAuthorUsername: input.storyAuthorUsername,
      storyAuthorId: input.storyAuthorId,
    },
  });

  return { error };
}
