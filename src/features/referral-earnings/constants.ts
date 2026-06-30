import type { ReferralCommissionStatus } from '@/features/referral-earnings/types';

export const REFERRAL_ROUTE = '/referral';
export const REFERRAL_INVITED_BY_ROUTE = '/referral/invited-by';

export const ADMIN_REFERRAL_ROUTE = '/admin/referral-earnings';
export const ADMIN_REFERRAL_SETTINGS_ROUTE = '/admin/referral-settings';
export const ADMIN_REFERRAL_FINANCE_ROUTE = '/admin/referral-finance';

export function adminReferralDetailPath(commissionId: string): string {
  return `/admin/referral-earnings/${encodeURIComponent(commissionId)}`;
}

export const REFERRAL_ACCENT = '#8B5CF6';
export const REFERRAL_GRADIENT = ['#6D28D9', '#8B5CF6', '#A78BFA'] as const;

export const REFERRAL_STATUS_LABELS: Record<ReferralCommissionStatus, string> = {
  pending: 'Beklemede',
  in_progress: 'Devam Ediyor',
  reviewing: 'İncelemede',
  earned: 'Hak Edildi',
  approved: 'Onaylandı',
  paid: 'Ödendi',
  rejected: 'Reddedildi',
  cancelled: 'İptal',
};

export const REFERRAL_STATUS_COLORS: Record<ReferralCommissionStatus, string> = {
  pending: '#94A3B8',
  in_progress: '#3B82F6',
  reviewing: '#F59E0B',
  earned: '#10B981',
  approved: '#6366F1',
  paid: '#059669',
  rejected: '#EF4444',
  cancelled: '#64748B',
};

export function formatReferralCents(cents: number): string {
  return `₺${(cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function referralProgressLabel(current: number, target: number, unit = ''): string {
  return `${current}${unit} / ${target}${unit}`;
}
