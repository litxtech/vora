import { sendMessage } from './messageData';
import { uploadMessageMedia } from './messageMediaUpload';
import { uploadMessageVideo } from './messageVideoUpload';
import {
  bumpQueueAttempt,
  getAllQueuedMessages,
  removeQueuedMessage,
  resetQueueAttempts,
  type QueuedMessage,
} from './messageQueue';

export async function processQueuedItem(item: QueuedMessage): Promise<{ ok: boolean; error?: string }> {
  let mediaUrl = item.mediaUrl ?? null;

  if (!mediaUrl && item.localUri) {
    let uploadResult: { url: string | null; error: string | null };

    if (item.messageType === 'video') {
      uploadResult = await uploadMessageVideo(item.senderId, item.localUri, {
        mimeType: item.mimeType ?? 'video/mp4',
      });
    } else if (
      item.messageType === 'image' ||
      item.messageType === 'audio' ||
      item.messageType === 'file'
    ) {
      uploadResult = await uploadMessageMedia(
        item.senderId,
        item.localUri,
        item.messageType,
        item.mimeType ?? undefined,
        item.fileName ?? undefined,
      );
    } else if (
      item.messageType === 'shared_post' ||
      item.messageType === 'shared_reel' ||
      item.messageType === 'shared_profile'
    ) {
      uploadResult = await uploadMessageMedia(
        item.senderId,
        item.localUri,
        'file',
        item.mimeType ?? undefined,
        item.fileName ?? undefined,
      );
    } else {
      return { ok: false, error: 'Medya yüklenemedi.' };
    }

    const { url, error: uploadError } = uploadResult;
    if (uploadError || !url) {
      await bumpQueueAttempt(item.id);
      return { ok: false, error: uploadError ?? 'Yükleme başarısız.' };
    }
    mediaUrl = url;
  }

  const { message, error } = await sendMessage(item.conversationId, item.senderId, item.content, {
    messageType: item.messageType,
    mediaUrl,
    replyToId: item.replyToId,
    metadata: item.metadata ?? null,
  });

  if (message) {
    await removeQueuedMessage(item.id);
    return { ok: true };
  }

  await bumpQueueAttempt(item.id);
  return { ok: false, error: error ?? 'Mesaj gönderilemedi.' };
}

export async function retryQueuedMessage(
  queueId: string,
): Promise<{ ok: boolean; error?: string; conversationId?: string }> {
  const queue = await getAllQueuedMessages();
  const item = queue.find((m) => m.id === queueId);
  if (!item) {
    return { ok: false, error: 'Mesaj kuyrukta bulunamadı.' };
  }

  await resetQueueAttempts(queueId);
  const result = await processQueuedItem({ ...item, attempts: 0 });
  return { ...result, conversationId: item.conversationId };
}

export async function removePendingFromQueue(messageId: string): Promise<void> {
  if (messageId.startsWith('queue-')) {
    await removeQueuedMessage(messageId);
  }
}
