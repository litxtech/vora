import type { CommerceModule, CommerceOpsTab, CommerceQueueFilter } from '@/features/commerce-ops/types';

export const COMMERCE_OPS_ACCENT = '#6366F1';
export const COMMERCE_OPS_GRADIENT = ['#6366F1', '#8B5CF6'] as const;

export const COMMERCE_OPS_TABS: { id: CommerceOpsTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Genel', icon: 'grid-outline' },
  { id: 'hotel', label: 'Otel', icon: 'bed-outline' },
  { id: 'marketplace', label: 'Pazar', icon: 'storefront-outline' },
  { id: 'rides', label: 'Yolculuk', icon: 'car-outline' },
  { id: 'personnel', label: 'Personel', icon: 'people-outline' },
  { id: 'finance', label: 'Finans', icon: 'wallet-outline' },
];

export const COMMERCE_QUEUE_FILTERS: { id: CommerceQueueFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'pending', label: 'Bekleyen' },
  { id: 'escrow', label: 'Escrow' },
  { id: 'payout_due', label: 'Ödeme' },
  { id: 'completed', label: 'Tamamlanan' },
];

export const MODULE_LABELS: Record<CommerceModule, string> = {
  hotel: 'Otel',
  marketplace: 'Yerel Pazar',
  rides: 'Yolculuk',
  personnel: 'Personel',
};

export const MODULE_ACCENTS: Record<CommerceModule, string> = {
  hotel: '#00897B',
  marketplace: '#FF9800',
  rides: '#3B82F6',
  personnel: '#8B5CF6',
};

export const MODULE_ICONS: Record<CommerceModule, string> = {
  hotel: 'bed-outline',
  marketplace: 'storefront-outline',
  rides: 'car-outline',
  personnel: 'people-outline',
};

export function formatCommerceCents(cents: number): string {
  return `${(cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0 })} ₺`;
}

export function formatCommerceDate(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCommerceShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
