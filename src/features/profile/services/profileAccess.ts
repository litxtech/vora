import { isDeletedAccount, isFrozenAccount } from '@/features/account-deletion/utils';
import { BLOCKED_BY_USER_MESSAGE, BLOCK_PROFILE_MESSAGE } from '@/features/moderation/constants/blocking';
import type { ProfileRelationship, PublicProfile } from '@/features/profile/types';

export type ProfileAccessResult = {
  allowed: boolean;
  reason: string | null;
};

export function checkProfileAccess(
  profile: PublicProfile,
  viewerId: string | null,
  _isGuest: boolean,
  relationship: ProfileRelationship,
  isOwnProfile: boolean,
): ProfileAccessResult {
  if (isOwnProfile) return { allowed: true, reason: null };
  if (isDeletedAccount(profile.accountStatus)) return { allowed: true, reason: null };
  if (isFrozenAccount(profile.accountStatus)) {
    return { allowed: false, reason: 'Bu hesap dondurulmuş.' };
  }

  if (relationship.isBlocked) {
    return {
      allowed: false,
      reason: relationship.blockedByThem ? BLOCKED_BY_USER_MESSAGE : BLOCK_PROFILE_MESSAGE,
    };
  }

  switch (profile.profileVisibility) {
    case 'public':
      return { allowed: true, reason: null };
    case 'members':
      if (!viewerId) {
        return { allowed: false, reason: 'Bu profil sadece üyelere açıktır.' };
      }
      return { allowed: true, reason: null };
    case 'friends':
      if (!viewerId) {
        return { allowed: false, reason: 'Bu profil sadece arkadaşlara açıktır.' };
      }
      if (relationship.friendshipStatus !== 'friends') {
        return { allowed: false, reason: 'Bu profil sadece arkadaşlara açıktır. Karşılıklı takiple erişebilirsiniz.' };
      }
      return { allowed: true, reason: null };
    default:
      return { allowed: true, reason: null };
  }
}
