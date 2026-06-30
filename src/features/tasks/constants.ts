import { SUBSCRIPTIONS_ENABLED } from '@/features/profile/constants/subscriptionsConfig';
import { TRUST_POINT_VALUES } from '@/features/profile/constants';
import type { TaskRewardType } from '@/features/tasks/types';
import { PUAN_LABEL, PUAN_SYMBOL } from '@/features/wallet/constants';
import type { Ionicons } from '@expo/vector-icons';

/** Görev başına güven puanı — TRUST_POINT_VALUES ile uyumlu */
export const DAILY_TASK_TRUST_POINTS = {
  share_post: 1,
  comment: TRUST_POINT_VALUES.commentQuality,
  verify_news: TRUST_POINT_VALUES.newsVerifyCorrect,
  join_event: TRUST_POINT_VALUES.eventSuccess,
} as const;

/** Tüm görevler tamamlanıp ödülleri alındığında ek güven puanı */
export const ALL_TASKS_TRUST_BONUS = 2;

export const TASKS_GRADIENT = ['#7C3AED', '#6366F1', '#2563EB'] as const;
export const TASKS_GRADIENT_DEEP = '#1E1B4B';

export const TASKS_SCREEN_SUBTITLE = `Görevleri tamamla, ${PUAN_LABEL.toLowerCase()} kazan.`;

export const TASK_CLAIM_HINT = `Görev tamamlandığında «Ödülü Al»a dokunun; ${PUAN_LABEL.toLowerCase()} profilinize yansır.`;

export const TASK_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  share_post: 'create-outline',
  comment: 'chatbubble-outline',
  verify_news: 'checkmark-done-outline',
  join_event: 'calendar-outline',
};

export function rewardLabel(type: TaskRewardType, value: number): string {
  switch (type) {
    case 'points':
    case 'kuru':
      return `+${value} ${PUAN_SYMBOL}`;
    case 'premium_days':
      return SUBSCRIPTIONS_ENABLED ? `+${value} gün Premium` : `+${value} gün bonus`;
    case 'badge':
      return 'Rozet';
    case 'achievement':
      return 'Başarım';
    default:
      return 'Ödül';
  }
}

export const ALL_TASKS_BONUS = SUBSCRIPTIONS_ENABLED
  ? `Tüm görevleri tamamlayıp ödülleri alınca +${ALL_TASKS_TRUST_BONUS} ${PUAN_SYMBOL} bonusu, «Günlük Kahraman» başarımı ve +1 gün Premium kazanırsınız.`
  : `Tüm görevleri tamamlayıp ödülleri alınca +${ALL_TASKS_TRUST_BONUS} ${PUAN_SYMBOL} bonusu ve «Günlük Kahraman» başarımı kazanırsınız.`;
