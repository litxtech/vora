import { isHiddenPublicAccount } from '@/features/account-deletion/utils';

export function resolvePioneer(
  isPioneer: boolean | undefined | null,
  accountStatus?: string,
): boolean {
  return !isHiddenPublicAccount(accountStatus) && Boolean(isPioneer);
}
