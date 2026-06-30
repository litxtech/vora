import { FEED_FILTERS } from '@/features/feed/constants';
import type { AdminStatistics, AdminStatisticsModeration } from '@/features/admin/types';
import { TIP_LINE_ENABLED } from '@/features/tip-line/constants';
import type { Ionicons } from '@expo/vector-icons';

export type StatisticsTab = 'overview' | 'rankings' | 'moderation';
export type RankingFilter = 'cities' | 'users' | 'content' | 'categories';

export const STATISTICS_TABS = [
  { id: 'overview' as const, label: 'Genel Bakış' },
  { id: 'rankings' as const, label: 'Sıralamalar' },
  { id: 'moderation' as const, label: 'Moderasyon' },
];

export const RANKING_FILTERS = [
  { id: 'cities' as const, label: 'Şehirler' },
  { id: 'users' as const, label: 'Kullanıcılar' },
  { id: 'content' as const, label: 'İçerik' },
  { id: 'categories' as const, label: 'Kategoriler' },
];

export type ModerationQueueItem = {
  key: keyof AdminStatisticsModeration;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  group: 'security' | 'verification' | 'operations';
};

export const MODERATION_QUEUE_ITEMS: ModerationQueueItem[] = [
  { key: 'pending_reports', label: 'Bekleyen şikayet', icon: 'flag', group: 'security' },
  { key: 'pending_appeals', label: 'İtiraz', icon: 'hand-left', group: 'security' },
  ...(TIP_LINE_ENABLED
    ? [{ key: 'pending_tips' as const, label: 'Bekleyen ihbar', icon: 'eye-off' as const, group: 'security' as const }]
    : []),
  { key: 'disputed_vcts', label: 'VCTS itirazı', icon: 'finger-print', group: 'security' },
  { key: 'pending_verifications', label: 'Kurumsal doğrulama', icon: 'shield-checkmark', group: 'verification' },
  { key: 'pending_identity_verifications', label: 'Kimlik doğrulama', icon: 'id-card', group: 'verification' },
  { key: 'pending_reporter_apps', label: 'Muhabir başvurusu', icon: 'newspaper', group: 'verification' },
  { key: 'pending_post_verifications', label: 'Doğrulama merkezi', icon: 'shield', group: 'verification' },
  { key: 'pending_ads', label: 'Bekleyen reklam', icon: 'megaphone', group: 'operations' },
  { key: 'ai_review_queue', label: 'AI inceleme kuyruğu', icon: 'sparkles', group: 'operations' },
  { key: 'pending_support_tickets', label: 'Destek talebi', icon: 'chatbubbles', group: 'operations' },
];

export const MODERATION_GROUP_LABELS: Record<ModerationQueueItem['group'], string> = {
  security: 'Güvenlik ve şikayet',
  verification: 'Doğrulama kuyrukları',
  operations: 'Operasyon ve destek',
};

export function categoryLabel(category: string): string {
  return FEED_FILTERS.find((c) => c.id === category)?.label ?? category;
}

export function postPreview(post: AdminStatistics['top_posts'][number]): string {
  const text = post.title?.trim() || post.content.trim();
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export function formatStatPercent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function moderationTotal(moderation?: AdminStatisticsModeration): number {
  if (!moderation) return 0;
  return Object.values(moderation).reduce((sum, n) => sum + n, 0);
}

export function formatGeneratedAt(value?: string): string | null {
  if (!value) return null;
  return new Date(value).toLocaleString('tr-TR');
}
