export const WALLET_ROUTE = '/wallet';
export const WALLET_POINTS_HISTORY_ROUTE = '/wallet/points-history';

export function walletActivityPath(activityId: string): string {
  return `/wallet/activity/${encodeURIComponent(activityId)}`;
}

export const PUAN_LABEL = 'Güven Puanı';
export const PUAN_SYMBOL = 'puan';

export const JETON_LABEL = 'Jeton';
export const JETON_SYMBOL = 'jeton';

export function formatJeton(amount: number): string {
  const prefix = amount >= 0 ? '+' : '';
  return `${prefix}${amount.toLocaleString('tr-TR')} ${JETON_SYMBOL}`;
}

export function formatJetonBalance(amount: number): string {
  return `${amount.toLocaleString('tr-TR')} ${JETON_SYMBOL}`;
}

/** Cüzdan hero ve vurgu renkleri */
export const WALLET_GRADIENT = ['#1E3A8A', '#2563EB', '#7C3AED'] as const;
export const WALLET_GRADIENT_DEEP = '#1E1B4B';
export const POINTS_ACCENT = '#FBBF24';
export const POINTS_GRADIENT = ['#F59E0B', '#D97706', '#B45309'] as const;
export const EARNINGS_ACCENT = '#34D399';
export const EARNINGS_GRADIENT = ['#059669', '#10B981', '#047857'] as const;

export const TRUST_SOURCE_LABELS: Record<string, string> = {
  incident_verified: 'Doğrulanmış olay bildirimi',
  news_verify_correct: 'Doğru haber doğrulaması',
  news_verify_incorrect: 'Yanlış haber doğrulaması',
  comment_quality: 'Faydalı yorum',
  event_success: 'Başarılı etkinlik',
  identity_verified: 'Kimlik doğrulama',
  friend_invite_redeemed: 'Arkadaş davet kodu kullanımı',
  friend_invite_referral: 'Arkadaş daveti',
  daily_task: 'Günlük görev ödülü',
  daily_tasks_complete: 'Tüm günlük görevler bonusu',
  vacation_card_share_verified: 'Tatil kartı paylaşımı',
  first_verified_content: 'İlk doğrulanmış içerik',
  clean_streak_30d: '30 gün temiz geçmiş',
  clean_streak_90d: '90 gün temiz geçmiş',
  report_penalty: 'Onaylanmış ihlal cezası',
  moderation_penalty: 'Moderasyon cezası',
  admin_adjust: 'Platform düzenlemesi yapıldı',
};

export function formatPoints(amount: number): string {
  const prefix = amount >= 0 ? '+' : '';
  return `${prefix}${amount.toLocaleString('tr-TR')} ${PUAN_SYMBOL}`;
}

export function formatPointsBalance(amount: number, maxScore?: number): string {
  if (maxScore != null) {
    return `${amount.toLocaleString('tr-TR')} / ${maxScore} ${PUAN_SYMBOL}`;
  }
  return `${amount.toLocaleString('tr-TR')} ${PUAN_SYMBOL}`;
}
