import { ACCOUNT_DELETION_GRACE_DAYS } from '@/features/account-deletion/constants';
import { formatDeletedAccountDate } from '@/features/account-deletion/utils';
import type {
  AccountAccessReviewPayload,
  AccountAccessScenario,
  PostLoginAccessResult,
} from '@/features/auth/types/accountAccessReview';
import { hasActiveBan } from '@/features/auth/services/sessionPolicy';
import { resolveIsGuestUser } from '@/features/auth/services/guestAccount';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type AccessProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  | 'onboarding_completed'
  | 'is_guest'
  | 'account_status'
  | 'created_at'
  | 'updated_at'
  | 'deletion_requested_at'
  | 'deleted_at'
>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function formatRemainingDuration(remainingMs: number): string {
  if (remainingMs <= 0) return 'Süre doldu';

  const days = Math.floor(remainingMs / MS_PER_DAY);
  const hours = Math.floor((remainingMs % MS_PER_DAY) / (3_600_000));
  const minutes = Math.floor((remainingMs % (3_600_000)) / 60_000);

  if (days > 0) return `${days} gün ${hours} saat`;
  if (hours > 0) return `${hours} saat ${minutes} dakika`;
  return `${minutes} dakika`;
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 0;
  return Math.floor(diff / MS_PER_DAY);
}

function addGraceDays(iso: string): string {
  const date = new Date(iso);
  date.setDate(date.getDate() + ACCOUNT_DELETION_GRACE_DAYS);
  return date.toISOString();
}

function buildPayload(
  scenario: AccountAccessScenario,
  profile: AccessProfileRow,
  keepSession: boolean,
): AccountAccessReviewPayload {
  const deletionRequestedAt = profile.deletion_requested_at;
  const permanentDeletionAt = deletionRequestedAt ? addGraceDays(deletionRequestedAt) : null;
  const remainingMs =
    permanentDeletionAt != null
      ? Math.max(0, new Date(permanentDeletionAt).getTime() - Date.now())
      : null;

  return {
    scenario,
    createdAt: profile.created_at,
    frozenAt: scenario === 'frozen' ? profile.updated_at : null,
    deletionRequestedAt,
    deletedAt: profile.deleted_at,
    permanentDeletionAt,
    remainingMs,
    daysSinceDeletion: daysSince(profile.deleted_at),
    keepSession,
  };
}

export type AccountAccessInfoRow = {
  label: string;
  value: string;
  highlight?: boolean;
};

export function buildAccountAccessInfoRows(payload: AccountAccessReviewPayload): AccountAccessInfoRow[] {
  const rows: AccountAccessInfoRow[] = [
    {
      label: 'Hesap açılış tarihi',
      value: formatDeletedAccountDate(payload.createdAt),
    },
  ];

  if (payload.scenario === 'frozen') {
    rows.push({
      label: 'Dondurulma tarihi',
      value: formatDeletedAccountDate(payload.frozenAt),
    });
    rows.push({
      label: 'Tekrar kullanıma açılma',
      value: 'Destek ekibi onayı ile yeniden etkinleştirilir',
      highlight: true,
    });
    return rows;
  }

  if (payload.scenario === 'deletion_pending') {
    const daysSinceRequest = daysSince(payload.deletionRequestedAt);
    if (daysSinceRequest != null) {
      rows.push({
        label: 'Silme talebi',
        value:
          daysSinceRequest === 0
            ? 'Bugün oluşturuldu'
            : `${daysSinceRequest} gün önce oluşturuldu`,
      });
    }
    rows.push({
      label: 'Silme talebi tarihi',
      value: formatDeletedAccountDate(payload.deletionRequestedAt),
    });
    rows.push({
      label: 'Tüm verilerin silineceği tarih',
      value: formatDeletedAccountDate(payload.permanentDeletionAt),
      highlight: true,
    });
    if (payload.remainingMs != null) {
      rows.push({
        label: 'Kalan süre',
        value: formatRemainingDuration(payload.remainingMs),
        highlight: true,
      });
    }
    return rows;
  }

  if (payload.scenario === 'deleted') {
    rows.push({
      label: 'Silinme tarihi',
      value: formatDeletedAccountDate(payload.deletedAt),
    });
    if (payload.daysSinceDeletion != null) {
      rows.push({
        label: 'Silinme',
        value:
          payload.daysSinceDeletion === 0
            ? 'Bugün silindi'
            : `${payload.daysSinceDeletion} gün önce silindi`,
      });
    }
    rows.push({
      label: 'Veri durumu',
      value: 'Tüm kişisel verileriniz kalıcı olarak yok edildi',
      highlight: true,
    });
    return rows;
  }

  rows.push({
    label: 'Erişim durumu',
    value: 'Hesabınıza geçici olarak erişim kapatıldı',
    highlight: true,
  });
  return rows;
}

export async function resolvePostLoginAccess(userId: string): Promise<PostLoginAccessResult> {
  const [{ data: profile }, { data: userData }] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'onboarding_completed, is_guest, account_status, created_at, updated_at, deletion_requested_at, deleted_at',
      )
      .eq('id', userId)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const user = userData.user;

  if (!profile) {
    if (user && resolveIsGuestUser(user, null)) {
      return { action: 'continue', destination: '/(tabs)' };
    }
    return { action: 'continue', destination: '/(onboarding)/profile-setup' };
  }

  const banned = await hasActiveBan(userId);
  if (banned) {
    return {
      action: 'review',
      payload: buildPayload('banned', profile, false),
      signOutReason: 'ban',
    };
  }

  if (profile.account_status === 'quarantined' || profile.account_status === 'frozen') {
    return {
      action: 'review',
      payload: buildPayload('frozen', profile, false),
      signOutReason: 'frozen',
    };
  }

  if (profile.account_status === 'deleted') {
    return {
      action: 'review',
      payload: buildPayload('deleted', profile, false),
      signOutReason: 'deleted',
    };
  }

  if (profile.account_status === 'deletion_pending') {
    return {
      action: 'review',
      payload: buildPayload('deletion_pending', profile, true),
    };
  }

  return {
    action: 'continue',
    destination:
      user && resolveIsGuestUser(user, profile)
        ? '/(tabs)'
        : profile.onboarding_completed === false
          ? '/(onboarding)/profile-setup'
          : '/(tabs)',
  };
}

export function accountAccessReviewTitle(scenario: AccountAccessScenario): string {
  switch (scenario) {
    case 'frozen':
      return 'Hesabınız Donduruldu';
    case 'deletion_pending':
      return 'Hesap Silme Süreci Aktif';
    case 'deleted':
      return 'Hesap Silinmiş';
    default:
      return 'Hesap Erişimi Kısıtlı';
  }
}

export function accountAccessReviewDescription(scenario: AccountAccessScenario): string {
  switch (scenario) {
    case 'frozen':
      return 'Bu hesap dondurulduğu için giriş yapamazsınız. Aşağıda hesap geçmişinizi ve yeniden erişim bilgisini görebilirsiniz.';
    case 'deletion_pending':
      return 'Hesap silme talebiniz devam ediyor. Belirtilen tarihte tüm verileriniz kalıcı olarak silinecek. İsterseniz talebi iptal edip devam edebilirsiniz.';
    case 'deleted':
      return 'Bu hesap kalıcı olarak silinmiştir. Aynı e-posta ile yeni hesap açabilirsiniz.';
    default:
      return 'Hesabınıza şu anda giriş yapılamıyor.';
  }
}
