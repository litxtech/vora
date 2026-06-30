import { Linking, Platform, Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { saveUriToGallery } from '@/features/compose/services/saveMediaToGallery';
import { toUserFacingError } from '@/lib/errors';
import { openUrl } from '@/lib/linking/openUrl';

const CAPTURE_DELAY_MS = 120;

export async function captureAppShareCard(
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

export async function shareAppShareCardImage(
  uri: string,
  message?: string,
): Promise<{ error: string | null }> {
  try {
    if (message) {
      try {
        await Share.share(
          Platform.OS === 'ios'
            ? { url: uri, message }
            : { message, url: uri, title: 'Vora X' },
        );
        return { error: null };
      } catch {
        // expo-sharing fallback below
      }
    }

    const Sharing = await import('expo-sharing');
    if (!(await Sharing.isAvailableAsync())) {
      return { error: 'Görsel paylaşımı bu cihazda desteklenmiyor.' };
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'image/jpeg',
      UTI: 'public.jpeg',
      dialogTitle: 'Vora X · Uygulama kartı',
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

export async function saveAppShareCardToGallery(uri: string): Promise<{ error: string | null }> {
  const result = await saveUriToGallery(uri, 'photo');
  return result.ok ? { error: null } : { error: result.error ?? 'Galeriye kaydedilemedi.' };
}

export async function shareAppWhatsApp(message: string): Promise<{ error: string | null }> {
  const encoded = encodeURIComponent(message);
  const whatsappUrl = `whatsapp://send?text=${encoded}`;

  try {
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await openUrl(whatsappUrl);
      return { error: null };
    }

    await Share.share(Platform.OS === 'android' ? { message, title: 'Vora X' } : { message });
    return { error: null };
  } catch (error) {
    return {
      error: toUserFacingError(error instanceof Error ? error.message : null, {
        fallback: 'WhatsApp paylaşımı açılamadı.',
      }),
    };
  }
}
