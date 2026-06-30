import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export type ProximityMatchIneligibilityReason = 'inactive_account' | 'no_session';

export function resolveProximityMatchEligibility(
  profile: Profile | null,
  hasUser: boolean,
): { eligible: boolean; reason: ProximityMatchIneligibilityReason | null } {
  if (!hasUser) {
    return { eligible: false, reason: 'no_session' };
  }

  if (profile && profile.account_status !== 'active') {
    return { eligible: false, reason: 'inactive_account' };
  }

  return { eligible: true, reason: null };
}

export function proximityMatchIneligibilityMessage(
  reason: ProximityMatchIneligibilityReason,
): string {
  switch (reason) {
    case 'no_session':
      return 'Eşleşme için giriş yapmanız gerekir.';
    case 'inactive_account':
      return 'Hesabınız şu anda eşleşme için uygun değil.';
    default:
      return 'Eşleşme şu anda kullanılamıyor.';
  }
}
