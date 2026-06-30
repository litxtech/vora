import { isHiddenPublicAccount } from '@/features/account-deletion/utils';

export function resolvePlatformSupporter(
  isPlatformSupporter: boolean | undefined | null,
  accountStatus?: string,
): boolean {
  return !isHiddenPublicAccount(accountStatus) && Boolean(isPlatformSupporter);
}
