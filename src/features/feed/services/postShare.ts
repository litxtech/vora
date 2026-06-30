import { Linking, Platform, Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { saveUriToGallery } from '@/features/compose/services/saveMediaToGallery';
import { openUrl } from '@/lib/linking/openUrl';
import { buildPostShareUrl } from '@/lib/sharing/constants';
import { sharePostLink } from '@/lib/sharing/shareContent';
import { toUserFacingError } from '@/lib/errors';
import type { FeedItem } from '@/features/feed/types';

const CAPTURE_DELAY_MS = 120;

export async function capturePostShareCard(ref: RefObject<View | null>): Promise<{ uri: string | null; error: string | null }> {
  if (!ref.current) {
    return { uri: null, error: 'Kart hazır değil, lütfen tekrar deneyin.' };
  }

  await new Promise((resolve) => setTimeout(resolve, CAPTURE_DELAY_MS));

  try {
    const uri = await captureRef(ref, {
      format: 'jpg',
      quality: 0.94,
      result: 'tmpfile',
    });
    return { uri, error: null };
  } catch (error) {
    return {
      uri: null,
      error: toUserFacingError(error instanceof Error ? error.message : null, {
        fallback: 'Kart görseli oluşturulamadı.',
      }),
    };
  }
}

export async function sharePostShareCardImage(uri: string): Promise<{ error: string | null }> {
  try {
    const Sharing = await import('expo-sharing');
    if (!(await Sharing.isAvailableAsync())) {
      return { error: 'Görsel paylaşımı bu cihazda desteklenmiyor.' };
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'image/jpeg',
      UTI: 'public.jpeg',
      dialogTitle: 'Vora · Gönderi kartı',
    });
    return { error: null };
  } catch (error) {
    return {
      error: toUserFacingError(error instanceof Error ? error.message : null, {
        fallback: 'Paylaşım iptal edildi.',
      }),
    };
  }
}

export async function savePostShareCardToGallery(uri: string): Promise<{ error: string | null }> {
  const result = await saveUriToGallery(uri, 'photo');
  return result.ok ? { error: null } : { error: result.error ?? 'Galeriye kaydedilemedi.' };
}

function buildPostShareMessage(item: FeedItem): string {
  const url = buildPostShareUrl(item.sourceId);
  const author = item.author.fullName
    ? `${item.author.fullName} (@${item.author.username})`
    : `@${item.author.username}`;
  const headline = item.title?.trim();
  const snippet = item.content.trim().replace(/\s+/g, ' ').slice(0, 200);
  const parts = [author, headline, snippet, item.vctsTrustCode ? '✓ VORA Doğrulanmış içerik' : null, url, '— vora.app'].filter(
    Boolean,
  );
  return parts.join('\n\n');
}

export async function sharePostLinkOnly(item: FeedItem): Promise<void> {
  await sharePostLink({
    postId: item.sourceId,
    title: item.title,
    content: item.content,
    authorUsername: item.author.username,
    authorDisplayName: item.author.fullName,
    verified: !!item.vctsTrustCode,
  });
}

export async function sharePostWhatsApp(item: FeedItem): Promise<{ error: string | null }> {
  const message = buildPostShareMessage(item);
  const encoded = encodeURIComponent(message);
  const whatsappUrl = `whatsapp://send?text=${encoded}`;

  try {
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await openUrl(whatsappUrl);
      return { error: null };
    }
    await Share.share(
      Platform.OS === 'ios' ? { message, url: buildPostShareUrl(item.sourceId) } : { message, title: item.title ?? 'Vora' },
    );
    return { error: null };
  } catch (error) {
    return {
      error: toUserFacingError(error instanceof Error ? error.message : null, {
        fallback: 'WhatsApp paylaşımı açılamadı.',
      }),
    };
  }
}
