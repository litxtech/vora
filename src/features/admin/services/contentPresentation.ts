import { CATEGORY_STYLES } from '@/features/feed/constants';
import type {
  AdminCommentRow,
  AdminContentStatusFilter,
  AdminContentTab,
  AdminPostRow,
  AdminReelRow,
} from '@/features/admin/services/contentManagement';
import { getMuxThumbnailUrl } from '@/lib/mux/client';
import type { ContentStatus } from '@/types/database';

export const ADMIN_CONTENT_TABS: { id: AdminContentTab; label: string }[] = [
  { id: 'posts', label: 'Gönderiler' },
  { id: 'reels', label: 'Reels' },
  { id: 'comments', label: 'Yorumlar' },
];

export const ADMIN_CONTENT_STATUS_FILTERS: { id: AdminContentStatusFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'published', label: 'Yayında' },
  { id: 'hidden', label: 'Gizli' },
  { id: 'removed', label: 'Kaldırıldı' },
];

export const ADMIN_CONTENT_STATUS_LABELS: Record<string, string> = {
  published: 'Yayında',
  hidden: 'Gizli',
  removed: 'Kaldırıldı',
  draft: 'Taslak',
};

export function adminContentStatusLabel(status: string): string {
  return ADMIN_CONTENT_STATUS_LABELS[status] ?? status;
}

export function adminContentStatusTone(status: string): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'published') return 'success';
  if (status === 'hidden') return 'warning';
  if (status === 'removed') return 'danger';
  return 'default';
}

export function adminPostCategoryLabel(category: string | null | undefined): string {
  if (!category) return 'Genel';
  return CATEGORY_STYLES[category]?.label ?? category;
}

export function adminContentPreviewText(
  value: string | null | undefined,
  max = 120,
): string {
  const text = value?.trim() ?? '';
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function adminPostHeadline(post: AdminPostRow): string {
  return post.title?.trim() || adminContentPreviewText(post.content, 80);
}

export function adminPostPreviewUrl(post: AdminPostRow): string | null {
  return post.media_urls?.[0] ?? null;
}

export function adminReelPreviewUrl(reel: AdminReelRow): string | null {
  const video = reel.video;
  if (!video) return null;
  return video.thumbnail_url ?? (video.mux_playback_id ? getMuxThumbnailUrl(video.mux_playback_id) : null);
}

export function formatAdminContentDate(value: string): string {
  return new Date(value).toLocaleString('tr-TR');
}

export type AdminContentPreview =
  | { type: 'post'; item: AdminPostRow }
  | { type: 'reel'; item: AdminReelRow }
  | { type: 'comment'; item: AdminCommentRow };

export function isModeratableStatus(status: ContentStatus | string): boolean {
  return status === 'published' || status === 'hidden';
}
