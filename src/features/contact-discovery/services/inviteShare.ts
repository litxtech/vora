import { Linking, Platform, Share } from 'react-native';
import { APP_DOMAIN } from '@/constants/app';

/** Paylaşımda yalnızca marka adresi gider. */
export const VORA_INVITE_URL = `https://${APP_DOMAIN}`;

function smsAddress(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

async function shareCleanLink(): Promise<void> {
  const url = VORA_INVITE_URL;
  await Share.share(Platform.OS === 'ios' ? { url } : { message: url, title: 'Vora' });
}

export async function invitePhoneBookContact(phone: string | undefined): Promise<void> {
  const address = phone ? smsAddress(phone) : '';
  if (address) {
    const separator = Platform.OS === 'ios' ? '&' : '?';
    try {
      await Linking.openURL(`sms:${address}${separator}body=${encodeURIComponent(VORA_INVITE_URL)}`);
      return;
    } catch {
      // Mesaj uygulaması açılamazsa paylaşım sayfasına düş.
    }
  }

  try {
    await shareCleanLink();
  } catch {
    // Paylaşım kapatıldı.
  }
}
