import {
  BLOCKED_BY_USER_MESSAGE,
  BLOCKED_OTHER_USER_MESSAGE,
} from '@/features/moderation/constants/blocking';
import { toUserFacingError } from '@/lib/errors';

const BLOCKED_BY_MARKERS = [
  'Bu kullanıcı sizi engelledi',
  'Bu kullanıcıyla mesajlaşamazsınız',
  'Bu kullanıcıyı arayamazsınız',
] as const;

const BLOCKED_OTHER_MARKERS = ['Bu kullanıcıyı engellediniz'] as const;

export function isBlockedByUserError(message: string | null | undefined): boolean {
  if (!message) return false;
  return BLOCKED_BY_MARKERS.some((marker) => message.includes(marker));
}

export function isBlockedOtherUserError(message: string | null | undefined): boolean {
  if (!message) return false;
  return BLOCKED_OTHER_MARKERS.some((marker) => message.includes(marker));
}

export function normalizeBlockError(message: string | null | undefined): string | null {
  if (!message) return null;
  if (isBlockedByUserError(message)) return BLOCKED_BY_USER_MESSAGE;
  if (isBlockedOtherUserError(message)) return BLOCKED_OTHER_USER_MESSAGE;
  return null;
}

export function alertBlockError(message: string | null | undefined): string {
  return normalizeBlockError(message) ?? toUserFacingError(message);
}
