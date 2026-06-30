import { notifyShareTarget } from '@/lib/notifications/helpers';
import { buildNotificationData } from '@/lib/notifications/notificationPayload';
import { supabase } from '@/lib/supabase/client';
import { sendMessage } from './messageData';
import type { MessageType, SharedCardMetadata } from '../types';

export type { SharedCardMetadata };

function messageTypeForCard(cardType: SharedCardMetadata['cardType']): MessageType {
  switch (cardType) {
    case 'post':
      return 'shared_post';
    case 'reel':
      return 'shared_reel';
    case 'profile':
      return 'shared_profile';
  }
}

function previewForCard(meta: SharedCardMetadata): string {
  switch (meta.cardType) {
    case 'post':
      return meta.title?.trim() || meta.preview?.trim() || 'Gönderi paylaşıldı';
    case 'reel':
      return meta.preview?.trim() || 'Reel paylaşıldı';
    case 'profile':
      return meta.username ? `@${meta.username}` : meta.title?.trim() || 'Profil paylaşıldı';
  }
}

export async function sendSharedCard(
  conversationId: string,
  senderId: string,
  meta: SharedCardMetadata,
): Promise<{ error: string | null }> {
  const { error } = await sendMessage(conversationId, senderId, previewForCard(meta), {
    messageType: messageTypeForCard(meta.cardType),
    metadata: meta,
  });

  if (!error && (meta.cardType === 'post' || meta.cardType === 'reel') && meta.targetId) {
    const table = meta.cardType === 'post' ? 'posts' : 'reels';
    const { data: content } = await supabase
      .from(table)
      .select('author_id')
      .eq('id', meta.targetId)
      .maybeSingle();

    if (content?.author_id && content.author_id !== senderId) {
      const label = meta.cardType === 'post' ? 'Gönderin paylaşıldı' : 'Reelin paylaşıldı';
      const body =
        meta.cardType === 'post'
          ? meta.title?.trim() || meta.preview?.trim() || 'Gönderin biriyle paylaşıldı'
          : meta.preview?.trim() || 'Reelin biriyle paylaşıldı';
      await notifyShareTarget(
        content.author_id,
        senderId,
        label,
        body.slice(0, 120),
        buildNotificationData(
          meta.cardType === 'post'
            ? { postId: meta.targetId }
            : { reelId: meta.targetId },
        ),
      );
    }
  }

  return { error };
}
