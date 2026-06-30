import type { GenderId } from '@/constants/registration';
import { isHiddenPublicAccount } from '@/features/account-deletion/utils';

export function resolvePlatformCharm(
  isPlatformCharm: boolean | undefined | null,
  accountStatus?: string,
): boolean {
  return !isHiddenPublicAccount(accountStatus) && Boolean(isPlatformCharm);
}

export function resolveAuthorGender(
  gender: GenderId | null | undefined,
  accountStatus?: string,
): GenderId | null {
  if (isHiddenPublicAccount(accountStatus)) return null;
  return gender ?? null;
}

/** Yazarın gizlediği tikler — silinmiş/dondurulmuş hesaplarda zaten hiçbir tik gösterilmez. */
export function resolveHiddenBadges(
  hiddenBadges: string[] | null | undefined,
  accountStatus?: string,
): string[] {
  if (isHiddenPublicAccount(accountStatus)) return [];
  return hiddenBadges ?? [];
}
