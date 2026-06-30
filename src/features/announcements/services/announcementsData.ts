import type { RegionId } from '@/constants/regions';
import { supabase } from '@/lib/supabase/client';
import type {
  Announcement,
  AnnouncementMediaItem,
  AnnouncementMediaType,
  AnnouncementViewer,
} from '@/features/announcements/types';

type MediaItemRow = {
  type?: string | null;
  url?: string | null;
  thumbnail_url?: string | null;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  media_type: string;
  media_url: string | null;
  thumbnail_url: string | null;
  media: MediaItemRow[] | null;
  link_url: string | null;
  link_label: string | null;
  accent: string;
  is_pinned: boolean;
  is_active: boolean;
  priority: number;
  region_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  author_id: string | null;
  business_id: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  view_count: number;
  cta_click_count: number;
  created_at: string;
  updated_at: string;
};

function mapMediaItems(row: AnnouncementRow): AnnouncementMediaItem[] {
  const list = Array.isArray(row.media) ? row.media : [];
  const items = list
    .filter((m): m is MediaItemRow => Boolean(m && m.url && (m.type === 'image' || m.type === 'video')))
    .map((m) => ({
      type: m.type as 'image' | 'video',
      url: m.url as string,
      thumbnailUrl: m.thumbnail_url ?? null,
    }));
  if (items.length > 0) return items;
  // Geriye dönük uyum: eski tekil medya sütunlarından türet.
  if ((row.media_type === 'image' || row.media_type === 'video') && row.media_url) {
    return [{ type: row.media_type, url: row.media_url, thumbnailUrl: row.thumbnail_url ?? null }];
  }
  return [];
}

export function mapAnnouncementRow(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body ?? '',
    mediaType: (row.media_type as AnnouncementMediaType) ?? 'none',
    mediaUrl: row.media_url,
    thumbnailUrl: row.thumbnail_url,
    media: mapMediaItems(row),
    linkUrl: row.link_url,
    linkLabel: row.link_label,
    accent: row.accent ?? '#1E88E5',
    isPinned: Boolean(row.is_pinned),
    isActive: Boolean(row.is_active),
    priority: row.priority ?? 0,
    regionId: (row.region_id as RegionId | null) ?? null,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    authorId: row.author_id,
    businessId: row.business_id,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url,
    viewCount: row.view_count ?? 0,
    ctaClickCount: row.cta_click_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapList(data: unknown): Announcement[] {
  if (!Array.isArray(data)) return [];
  return (data as AnnouncementRow[]).map(mapAnnouncementRow);
}

/** Feed şeridi için aktif duyurular (bölge filtreli). */
export async function fetchActiveAnnouncements(regionId: RegionId | null): Promise<Announcement[]> {
  const { data, error } = await supabase.rpc('fetch_active_announcements', {
    p_region_id: regionId ?? null,
  });
  if (error) return [];
  return mapList(data);
}

/** Kullanıcının kendi oluşturduğu duyurular (işletme / moderatör yönetimi). */
export async function fetchMyAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase.rpc('list_my_announcements');
  if (error) return [];
  return mapList(data);
}

export async function fetchAdminAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase.rpc('admin_list_announcements');
  if (error) return [];
  return mapList(data);
}

export async function recordAnnouncementView(id: string): Promise<void> {
  await supabase.rpc('record_announcement_view', { p_id: id });
}

export async function recordAnnouncementCtaClick(id: string): Promise<void> {
  await supabase.rpc('record_announcement_cta_click', { p_id: id });
}

type ViewerRow = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  viewed_at: string;
};

export async function fetchAnnouncementViewers(id: string): Promise<AnnouncementViewer[]> {
  const { data, error } = await supabase.rpc('list_announcement_viewers', { p_id: id });
  if (error || !Array.isArray(data)) return [];
  return (data as ViewerRow[]).map((row) => ({
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    viewedAt: row.viewed_at,
  }));
}
