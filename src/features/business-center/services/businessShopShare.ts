import { Linking, Platform, Share } from 'react-native';
import {
  buildBusinessShopShareMessage,
  buildBusinessShopSharePayload,
} from '@/features/business-center/services/businessShopShareMessage';
import { buildBusinessShopAndroidIntentUrl } from '@/lib/sharing/constants';
import { openUrl } from '@/lib/linking/openUrl';
import { toUserFacingError } from '@/lib/errors';

export {
  buildBusinessShopShareMessage,
  buildBusinessShopSharePayload,
} from '@/features/business-center/services/businessShopShareMessage';

type ShareInput = {
  id: string;
  name: string;
  shopTagline?: string | null;
  district?: string | null;
  commerceModeLabel?: string | null;
};

/**
 * Paylaşım linki share-preview üzerinden mobilde vora:// yönlendirmesi yapar.
 * iOS/Android Share.url: deep link — tarayıcı/HTML açılmaz.
 */
export async function shareBusinessShop(business: ShareInput): Promise<void> {
  const { message, deepLink, publicUrl, title } = buildBusinessShopSharePayload(business);

  if (Platform.OS === 'ios') {
    await Share.share({ message, url: deepLink, title });
    return;
  }

  // Android: intent URL öncelikli (WhatsApp / mesajlaşma uygulamalarında uygulamayı açar)
  const androidUrl = buildBusinessShopAndroidIntentUrl(business.id, publicUrl);
  try {
    await Share.share({ message, url: androidUrl, title });
  } catch {
    await Share.share({ message, url: deepLink, title });
  }
}

export async function shareBusinessShopWhatsApp(
  business: ShareInput,
): Promise<{ error: string | null }> {
  const { message, publicUrl } = buildBusinessShopSharePayload(business);
  const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

  try {
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await openUrl(whatsappUrl);
      return { error: null };
    }
    await Share.share({ message, title: business.name });
    return { error: null };
  } catch (error) {
    return {
      error: toUserFacingError(error instanceof Error ? error.message : null, {
        fallback: 'WhatsApp paylaşımı açılamadı.',
      }),
    };
  }
}
