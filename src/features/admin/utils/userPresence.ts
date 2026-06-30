const ONLINE_STALE_MS = 90_000;

export function isUserCurrentlyOnline(
  isOnline?: boolean | null,
  lastActiveAt?: string | null,
): boolean {
  if (!isOnline) return false;
  const activeMs = lastActiveAt ? new Date(lastActiveAt).getTime() : Date.now();
  return Date.now() - activeMs < ONLINE_STALE_MS;
}

export function formatAdminRegistrationDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatAdminLastEntry(
  lastSeenAt: string | null | undefined,
  isOnline?: boolean | null,
  lastActiveAt?: string | null,
): string {
  if (isUserCurrentlyOnline(isOnline, lastActiveAt)) {
    return 'Uygulamada';
  }

  const ref = lastActiveAt ?? lastSeenAt;
  if (!ref) return 'Henüz girmedi';

  const diffMs = Math.max(0, Date.now() - new Date(ref).getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 60) return 'Az önce girdi';
  if (diffMin < 60) return `${diffMin} dk önce girdi`;

  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours} saat önce girdi`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce girdi`;

  return new Date(ref).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatAdminDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatAdminRelativeAgo(value?: string | null): string | null {
  if (!value) return null;
  const diffMs = Math.max(0, Date.now() - new Date(value).getTime());
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 1) {
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    if (hours < 1) {
      const mins = Math.floor(diffMs / 60_000);
      return mins < 1 ? 'Bugün' : `${mins} dk önce`;
    }
    return `${hours} sa önce`;
  }
  if (days < 30) return `${days} gün önce`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ay önce`;
  return `${Math.floor(months / 12)} yıl önce`;
}

export function formatAdminSessionActivity(isCurrent: boolean, lastActiveAt: string): string {
  if (isCurrent) return 'Şu an bu cihazda';
  return formatAdminLastEntry(null, false, lastActiveAt);
}

export function deviceTypeIcon(deviceType: string | null | undefined): keyof typeof import('@expo/vector-icons').Ionicons.glyphMap {
  const type = (deviceType ?? '').toLowerCase();
  if (type === 'ios') return 'phone-portrait-outline';
  if (type === 'android') return 'logo-android';
  if (type === 'web') return 'globe-outline';
  return 'hardware-chip-outline';
}
