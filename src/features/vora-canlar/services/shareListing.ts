import { Platform, Share } from 'react-native';
import { VORA_SHARE_BASE_URL, VORA_SHARE_DOMAIN } from '@/lib/sharing/constants';

export function buildCanlarListingShareUrl(postId: string): string {
  return `${VORA_SHARE_BASE_URL.replace(/\/$/, '')}/c/${postId}`;
}

export async function shareCanlarListing(input: {
  id: string;
  body: string;
  city?: string | null;
}): Promise<void> {
  const url = buildCanlarListingShareUrl(input.id);
  const snippet = input.body.trim().replace(/\s+/g, ' ').slice(0, 280);
  const city = input.city?.trim();
  const message = [snippet, city, url, `— ${VORA_SHARE_DOMAIN}`].filter(Boolean).join('\n\n');
  await Share.share(Platform.OS === 'android' ? { message, title: 'Vora Canlar' } : { message });
}
