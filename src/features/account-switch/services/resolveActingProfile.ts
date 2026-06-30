import { enrichPublicProfile } from '@/features/profile/services/businessIdentity';
import type { BusinessProfile } from '@/features/profile/services/businessProfile';
import type { PublicProfile } from '@/features/profile/types';
import type { ActingMode } from '@/features/account-switch/types';

/** Aktif moda göre kendi profil görünümünü çözümler (oturum değiştirmeden). */
export function resolveActingProfile(
  profile: PublicProfile,
  business: BusinessProfile | null,
  actingAs: ActingMode,
): PublicProfile {
  if (actingAs === 'business' && business) {
    return enrichPublicProfile({ ...profile, accountType: 'business' }, business);
  }

  if (actingAs === 'personal' && profile.accountType === 'business') {
    return {
      ...profile,
      displayName: profile.fullName ?? profile.username,
      legalName: profile.fullName,
      isBusinessVerified: false,
      businessId: null,
      businessCategory: null,
      businessCategoryLabel: null,
    };
  }

  return enrichPublicProfile(profile, business);
}
