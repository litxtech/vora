import { Linking, Platform, Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { saveUriToGallery } from '@/features/compose/services/saveMediaToGallery';
import { openUrl } from '@/lib/linking/openUrl';
import { buildEventCheckInDeepLink, eventDetailPath } from '@/features/events/constants';
import { toUserFacingError } from '@/lib/errors';
import * as LinkingExpo from 'expo-linking';

const CAPTURE_DELAY_MS = 120;

export type EventQrSharePayload = {
  token: string;
  title: string;
  eventId: string;
  startsAt?: string | null;
  locationName?: string | null;
};

export async function captureEventQrShareCard(
  ref: RefObject<View | null>,
): Promise<{ uri: string | null; error: string | null }> {
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

export async function shareEventQrShareCardImage(uri: string): Promise<{ error: string | null }> {
  try {
    let Sharing: typeof import('expo-sharing');
    try {
      Sharing = await import('expo-sharing');
    } catch {
      return {
        error: 'Paylaşım modülü yüklenemedi. Metro\'yu yeniden başlatın veya dev client\'ı güncelleyin.',
      };
    }

    if (!(await Sharing.isAvailableAsync())) {
      return { error: 'Görsel paylaşımı bu cihazda desteklenmiyor.' };
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'image/jpeg',
      UTI: 'public.jpeg',
      dialogTitle: 'Vora · Etkinlik giriş kartı',
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

export async function saveEventQrShareCardToGallery(uri: string): Promise<{ error: string | null }> {
  const result = await saveUriToGallery(uri, 'photo');
  return result.ok ? { error: null } : { error: result.error ?? 'Galeriye kaydedilemedi.' };
}

function buildEventQrShareMessage(payload: EventQrSharePayload): string {
  const checkInLink = buildEventCheckInDeepLink(payload.token);
  const detailLink = LinkingExpo.createURL(eventDetailPath(payload.eventId).replace(/^\//, ''));
  const parts = [
    payload.title,
    payload.locationName ?? null,
    'Etkinlik girişi için Vora uygulamasında QR kodu okutun veya bağlantıyı açın:',
    checkInLink,
    `Etkinlik detayı: ${detailLink}`,
    '— vora.app',
  ].filter(Boolean);
  return parts.join('\n\n');
}

export async function shareEventQrLinkOnly(payload: EventQrSharePayload): Promise<void> {
  const message = buildEventQrShareMessage(payload);
  await Share.share(
    Platform.OS === 'ios'
      ? { message, url: buildEventCheckInDeepLink(payload.token) }
      : { message, title: payload.title },
  );
}

export async function shareEventQrWhatsApp(payload: EventQrSharePayload): Promise<{ error: string | null }> {
  const message = buildEventQrShareMessage(payload);
  const encoded = encodeURIComponent(message);
  const whatsappUrl = `whatsapp://send?text=${encoded}`;

  try {
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await openUrl(whatsappUrl);
      return { error: null };
    }
    await Share.share(
      Platform.OS === 'ios'
        ? { message, url: buildEventCheckInDeepLink(payload.token) }
        : { message, title: payload.title },
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
