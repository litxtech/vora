import { buildVerifyShareUrl } from '@/lib/sharing/constants';

export const VCTS_WATERMARK_VERSION = 1;

export type VctsContentType = 'text' | 'image' | 'video' | 'mixed';

export type VctsTrustStatus = 'verified' | 'disputed' | 'tampered' | 'pending';

export function buildVerifyUrl(trustCode: string): string {
  return buildVerifyShareUrl(trustCode);
}

export function buildDeepLink(trustCode: string): string {
  return `vora://v/${trustCode}`;
}

export function formatTrustCodeShort(trustCode: string): string {
  const parts = trustCode.split('-');
  if (parts.length >= 3) {
    return parts.slice(-1)[0] ?? trustCode;
  }
  return trustCode;
}
