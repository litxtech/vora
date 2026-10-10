import { DISPUTE_WINDOW_MS } from '@/features/purchase-history/constants';

export function disputeDeadline(purchasedAt: string): number {
  return new Date(purchasedAt).getTime() + DISPUTE_WINDOW_MS;
}

export function canDisputePurchase(
  purchasedAt: string,
  hasDispute: boolean,
  now = Date.now(),
): boolean {
  if (hasDispute) return false;
  const purchased = new Date(purchasedAt).getTime();
  if (Number.isNaN(purchased)) return false;
  return now < purchased + DISPUTE_WINDOW_MS;
}

export function disputeWindowLabel(purchasedAt: string, now = Date.now()): string {
  const left = disputeDeadline(purchasedAt) - now;
  if (left <= 0) return 'İtiraz süresi doldu';
  const hours = Math.ceil(left / (60 * 60 * 1000));
  if (hours > 48) {
    const days = Math.ceil(left / (24 * 60 * 60 * 1000));
    return `İtiraza ${days} gün kaldı`;
  }
  if (hours >= 1) return `İtiraza ${hours} saat kaldı`;
  const minutes = Math.max(1, Math.ceil(left / 60_000));
  return `İtiraza ${minutes} dakika kaldı`;
}

export function formatPurchaseDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTryCents(cents: number): string {
  return `${(cents / 100).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺`;
}
