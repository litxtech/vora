import type { DeletedBy } from '@/features/account-deletion/types';
import type { GenderId } from '@/constants/registration';

export function isDeletedAccount(
  accountStatus?: string | null,
): accountStatus is 'deleted' {
  return accountStatus === 'deleted';
}

export function isFrozenAccount(
  accountStatus?: string | null,
): accountStatus is 'frozen' | 'quarantined' {
  return accountStatus === 'frozen' || accountStatus === 'quarantined';
}

/** Silinmiş veya dondurulmuş hesaplar feed/profil/mesajda gizlenir. */
export function isHiddenPublicAccount(accountStatus?: string | null): boolean {
  return isDeletedAccount(accountStatus) || isFrozenAccount(accountStatus);
}

export function isBlockedBootAccountStatus(accountStatus?: string | null): boolean {
  return isHiddenPublicAccount(accountStatus);
}

export function isDeletionPending(accountStatus?: string | null): boolean {
  return accountStatus === 'deletion_pending';
}

export function formatDeletedAccountDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDeletedAccountSource(deletedBy: DeletedBy | null | undefined): string {
  if (deletedBy === 'platform') return 'Platform tarafında silindi';
  if (deletedBy === 'self') return 'Kullanıcı tarafında silindi';
  return 'Silinmiş hesap';
}

export function formatDeletedAccountNotice(
  deletedAt: string | null | undefined,
  deletedBy: DeletedBy | null | undefined,
): string {
  const date = formatDeletedAccountDate(deletedAt);
  const source = formatDeletedAccountSource(deletedBy);
  return `Bu hesap ${date} tarihinde silindi. ${source}.`;
}

export function deletedParticipantLabel(): string {
  return 'Kullanıcı artık yok';
}

export function frozenParticipantLabel(): string {
  return 'Hesap dondurulmuş';
}

export function hiddenParticipantLabel(accountStatus?: string | null): string {
  if (isDeletedAccount(accountStatus)) return deletedParticipantLabel();
  if (isFrozenAccount(accountStatus)) return frozenParticipantLabel();
  return 'Kullanıcı';
}

export function sanitizeAvatarUrl(
  avatarUrl: string | null | undefined,
  accountStatus?: string | null,
): string | null {
  if (isHiddenPublicAccount(accountStatus)) return null;
  return avatarUrl ?? null;
}

export function sanitizeDisplayName(
  fullName: string | null | undefined,
  username: string | null | undefined,
  accountStatus?: string | null,
): string {
  if (isHiddenPublicAccount(accountStatus)) return hiddenParticipantLabel(accountStatus);
  return fullName?.trim() || (username ? `@${username}` : 'Kullanıcı');
}

export function mapMessagingParticipant<T extends {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  account_status?: string | null;
  is_verified?: boolean;
  is_platform_charm?: boolean;
  is_pioneer?: boolean;
  is_platform_supporter?: boolean;
  gender?: GenderId | null;
  last_seen_at?: string | null;
  is_online?: boolean | null;
  last_active_at?: string | null;
}>(raw: T) {
  return {
    id: raw.id,
    username: raw.username,
    full_name: sanitizeDisplayName(raw.full_name, raw.username, raw.account_status),
    avatar_url: sanitizeAvatarUrl(raw.avatar_url, raw.account_status),
    account_status: raw.account_status ?? 'active',
    is_verified: isHiddenPublicAccount(raw.account_status) ? false : raw.is_verified,
    is_platform_charm: isHiddenPublicAccount(raw.account_status) ? false : Boolean(raw.is_platform_charm),
    is_pioneer: isHiddenPublicAccount(raw.account_status) ? false : Boolean(raw.is_pioneer),
    is_platform_supporter: isHiddenPublicAccount(raw.account_status) ? false : Boolean(raw.is_platform_supporter),
    gender: isHiddenPublicAccount(raw.account_status) ? null : (raw.gender ?? null),
    last_seen_at: raw.last_seen_at,
    is_online: raw.is_online ?? false,
    last_active_at: raw.last_active_at ?? null,
  };
}
