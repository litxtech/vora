import type { AccountAccessScenario } from '@/features/auth/types/accountAccessReview';

export type LifecycleRequestType = 'reactivate' | 'cancel_deletion' | 'restore_access' | 'general';

export const LIFECYCLE_REQUEST_TYPE_LABELS: Record<LifecycleRequestType, string> = {
  reactivate: 'Hesabı yeniden aç',
  cancel_deletion: 'Silme talebini iptal et',
  restore_access: 'Erişim talebi',
  general: 'Genel talep',
};

export const LIFECYCLE_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  in_progress: 'İşlemde',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  closed: 'Kapatıldı',
};

export function resolveDefaultRequestType(scenario: AccountAccessScenario): LifecycleRequestType {
  switch (scenario) {
    case 'frozen':
      return 'reactivate';
    case 'deletion_pending':
      return 'cancel_deletion';
    case 'deleted':
      return 'restore_access';
    default:
      return 'general';
  }
}

export const MIN_LIFECYCLE_MESSAGE_LENGTH = 10;

export type LifecycleStatFilter =
  | 'total_accounts'
  | 'active_accounts'
  | 'frozen_accounts'
  | 'deletion_pending_accounts'
  | 'deleted_accounts'
  | 'opened_today'
  | 'opened_this_month'
  | 'deleted_this_month'
  | 'pending_requests';

export const LIFECYCLE_STAT_FILTER_LABELS: Record<LifecycleStatFilter, string> = {
  total_accounts: 'Tüm hesaplar',
  active_accounts: 'Aktif hesaplar',
  frozen_accounts: 'Dondurulmuş hesaplar',
  deletion_pending_accounts: 'Silme bekleyen hesaplar',
  deleted_accounts: 'Silinmiş hesaplar',
  opened_today: 'Bugün açılan hesaplar',
  opened_this_month: 'Bu ay açılan hesaplar',
  deleted_this_month: 'Bu ay silinen hesaplar',
  pending_requests: 'Bekleyen talepler',
};
