import type { SupabaseClient } from '@supabase/supabase-js';

const GRACE_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type AccessScenario = 'frozen' | 'deleted' | 'deletion_pending' | 'banned';

type ProfileRow = {
  account_status: string | null;
  created_at: string;
  updated_at: string;
  deletion_requested_at: string | null;
  deleted_at: string | null;
};

export type AccessDecision =
  | { action: 'continue' }
  | { action: 'keep'; scenario: 'deletion_pending'; rows: { label: string; value: string }[] }
  | { action: 'end'; scenario: Exclude<AccessScenario, 'deletion_pending'>; message: string };

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function remaining(iso: string): string {
  const end = new Date(iso);
  end.setDate(end.getDate() + GRACE_DAYS);
  const ms = end.getTime() - Date.now();
  if (ms <= 0) return 'Süre doldu';
  const days = Math.floor(ms / MS_PER_DAY);
  const hours = Math.floor((ms % MS_PER_DAY) / 3_600_000);
  if (days > 0) return `${days} gün ${hours} saat`;
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours} saat ${minutes} dakika`;
  return `${minutes} dakika`;
}

export async function resolveWebAccess(supabase: SupabaseClient, userId: string): Promise<AccessDecision> {
  const { data } = await supabase
    .from('profiles')
    .select('account_status, created_at, updated_at, deletion_requested_at, deleted_at')
    .eq('id', userId)
    .maybeSingle();
  const profile = data as ProfileRow | null;
  if (!profile) return { action: 'continue' };

  const { data: bans } = await supabase
    .from('user_bans')
    .select('id, expires_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1);
  const ban = (bans ?? [])[0] as { expires_at: string | null } | undefined;
  const banned = Boolean(ban && (!ban.expires_at || new Date(ban.expires_at).getTime() > Date.now()));
  if (banned) {
    return { action: 'end', scenario: 'banned', message: 'Hesabınız askıya alındı. Oturumunuz sonlandırıldı.' };
  }

  if (profile.account_status === 'quarantined' || profile.account_status === 'frozen') {
    return { action: 'end', scenario: 'frozen', message: 'Hesabınız donduruldu. Oturumunuz sonlandırıldı.' };
  }
  if (profile.account_status === 'deleted') {
    return { action: 'end', scenario: 'deleted', message: 'Bu hesap silinmiştir. Oturumunuz sonlandırıldı.' };
  }
  if (profile.account_status === 'deletion_pending') {
    const deadline = profile.deletion_requested_at
      ? new Date(new Date(profile.deletion_requested_at).setDate(new Date(profile.deletion_requested_at).getDate() + GRACE_DAYS)).toISOString()
      : null;
    return {
      action: 'keep',
      scenario: 'deletion_pending',
      rows: [
        { label: 'Hesap açılış tarihi', value: formatWhen(profile.created_at) },
        { label: 'Silme talebi tarihi', value: formatWhen(profile.deletion_requested_at) },
        { label: 'Tüm verilerin silineceği tarih', value: formatWhen(deadline) },
        { label: 'Kalan süre', value: profile.deletion_requested_at ? remaining(profile.deletion_requested_at) : '—' },
      ],
    };
  }
  return { action: 'continue' };
}
