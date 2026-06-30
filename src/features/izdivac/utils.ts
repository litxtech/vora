import type { FeedAuthor } from '@/features/feed/types';
import type { IzdivacParticipant } from '@/features/izdivac/types';
import type { PublicProfile } from '@/features/profile/types';

export function izdivacDisplayName(participant: Pick<IzdivacParticipant, 'firstName' | 'lastName'>): string {
  const parts = [participant.firstName?.trim(), participant.lastName?.trim()].filter(Boolean);
  return parts.join(' ') || 'Üye';
}

export function izdivacParticipantToFeedAuthor(
  participant: IzdivacParticipant,
  profile?: PublicProfile | null,
): FeedAuthor {
  return {
    id: participant.userId,
    username: profile?.username ?? 'kullanici',
    fullName: profile?.fullName ?? profile?.displayName ?? izdivacDisplayName(participant),
    avatarUrl: participant.avatarUrl ?? profile?.avatarUrl ?? null,
    role: profile?.role ?? 'user',
    isVerified: profile?.isVerified ?? false,
    isBusinessVerified: profile?.isBusinessVerified,
    businessId: profile?.businessId ?? null,
    accountType: profile?.accountType ?? 'personal',
    isPlatformCharm: profile?.isPlatformCharm ?? false,
    isPioneer: profile?.isPioneer ?? false,
    isPlatformSupporter: profile?.isPlatformSupporter ?? false,
    gender: participant.gender ?? profile?.gender ?? null,
    accountStatus: profile?.accountStatus ?? 'active',
  };
}

type IzdivacProfileSlice = {
  izdivac_access_granted?: boolean | null;
  gender?: string | null;
  birth_date?: string | null;
  account_status?: string | null;
} | null | undefined;

/** Admin yetkisi verildiyse merkez butonu görünür. */
export function hasIzdivacGrant(profile: IzdivacProfileSlice): boolean {
  if (!profile?.izdivac_access_granted) return false;
  if (profile.account_status && profile.account_status !== 'active') return false;
  return true;
}

/** Lobiye katılım için profil tamamlanmış olmalı (cinsiyet + 18+). */
export function canJoinIzdivacLobby(profile: IzdivacProfileSlice): boolean {
  if (!hasIzdivacGrant(profile)) return false;
  if (profile!.gender !== 'female' && profile!.gender !== 'male') return false;
  if (!profile!.birth_date) return false;

  const birth = new Date(profile!.birth_date);
  if (Number.isNaN(birth.getTime())) return false;

  const adultCutoff = new Date();
  adultCutoff.setFullYear(adultCutoff.getFullYear() - 18);
  return birth <= adultCutoff;
}

export function izdivacLobbyBlockReason(profile: IzdivacProfileSlice): string | null {
  if (!hasIzdivacGrant(profile)) return 'İzdivaç erişiminiz yok.';
  if (profile!.gender !== 'female' && profile!.gender !== 'male') {
    return 'Lobiye girmek için profilinizde cinsiyet bilgisi tanımlı olmalıdır.';
  }
  if (!profile!.birth_date) {
    return 'Lobiye girmek için doğum tarihinizi profilinize ekleyin.';
  }
  if (!canJoinIzdivacLobby(profile)) {
    return 'İzdivaç alanına yalnızca 18 yaş ve üzeri üyeler katılabilir.';
  }
  return null;
}

/** @deprecated hasIzdivacGrant kullanın */
export function hasIzdivacProfileAccess(profile: IzdivacProfileSlice): boolean {
  return hasIzdivacGrant(profile);
}
