import { Platform } from 'react-native';
import { toUserFacingError } from '@/lib/errors';

type StorePlatform = 'ios' | 'android';

function storePlatform(): StorePlatform {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

const TECHNICAL_PATTERN =
  /requestpurchase|unable to complete|caused by|function has failed|storekit|billingclient|sku not found|product not found|e_[a-z_]+/i;

/** İncelemeci / kullanıcıya teknik SDK mesajı göstermeyi engeller. */
export function formatStorePurchaseError(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  const platform = storePlatform();

  if (lower.includes('user cancel') || lower.includes('cancelled')) {
    return '';
  }

  if (
    lower.includes('unable to complete request') ||
    lower.includes('requestpurchase') ||
    lower.includes('store product not available') ||
    lower.includes('product not found') ||
    lower.includes('sku not found') ||
    lower.includes('item unavailable')
  ) {
    return platform === 'ios'
      ? 'App Store satın alması şu an başlatılamadı. Lütfen birkaç saniye bekleyip tekrar deneyin. Sorun sürerse internet bağlantınızı ve App Store oturumunuzu kontrol edin.'
      : 'Google Play satın alması şu an başlatılamadı. Lütfen birkaç saniye bekleyip tekrar deneyin.';
  }

  if (
    lower.includes('network') ||
    lower.includes('internet') ||
    lower.includes('offline') ||
    lower.includes('timed out') ||
    lower.includes('timeout')
  ) {
    return 'İnternet bağlantısı kurulamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.';
  }

  if (lower.includes('not connected') || lower.includes('billing unavailable')) {
    return platform === 'ios'
      ? 'App Store bağlantısı kurulamadı. Lütfen uygulamayı kapatıp açın ve tekrar deneyin.'
      : 'Google Play bağlantısı kurulamadı. Lütfen uygulamayı kapatıp açın ve tekrar deneyin.';
  }

  if (TECHNICAL_PATTERN.test(trimmed)) {
    return platform === 'ios'
      ? 'Satın alma işlemi tamamlanamadı. Lütfen tekrar deneyin veya Satın Alımları Geri Yükle seçeneğini kullanın.'
      : 'Satın alma işlemi tamamlanamadı. Lütfen tekrar deneyin veya satın alımları geri yükleyin.';
  }

  return toUserFacingError(trimmed, {
    fallback:
      platform === 'ios'
        ? 'Satın alma işlemi tamamlanamadı. Lütfen tekrar deneyin veya Satın Alımları Geri Yükle seçeneğini kullanın.'
        : 'Satın alma işlemi tamamlanamadı. Lütfen tekrar deneyin veya satın alımları geri yükleyin.',
  });
}

export function storeProductsNotReadyMessage(): string {
  return storePlatform() === 'ios'
    ? 'App Store ürünleri henüz yüklenmedi. Lütfen birkaç saniye bekleyip tekrar deneyin.'
    : 'Google Play ürünleri henüz yüklenmedi. Lütfen birkaç saniye bekleyip tekrar deneyin.';
}

export function storePurchaseIncompleteMessage(): string {
  return storePlatform() === 'ios'
    ? 'Satın alma henüz tamamlanamadı. Ödemeniz kesildiyse «Satın Alımları Geri Yükle»ye basın.'
    : 'Satın alma henüz tamamlanamadı. Ödemeniz kesildiyse satın alımları geri yükleyin.';
}
