import { supabaseErrorMessage } from '@/lib/errors/userFacingError';
import { supabase } from '@/lib/supabase/client';
import type {
  PlatformGuideCategory,
  PlatformGuideDetail,
  PlatformGuideListItem,
  PlatformGuideSection,
} from '@/features/platform-guide/types';

type ListRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  icon: string;
  category: string;
  sort_order: number;
  published_at: string | null;
  has_image: boolean;
  has_video: boolean;
};

function mapListRow(row: ListRow): PlatformGuideListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    icon: row.icon,
    category: row.category as PlatformGuideCategory,
    sortOrder: row.sort_order,
    publishedAt: row.published_at,
    hasImage: row.has_image,
    hasVideo: row.has_video,
  };
}

function parseSections(raw: unknown): PlatformGuideSection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const heading = typeof record.heading === 'string' ? record.heading : '';
      const body = typeof record.body === 'string' ? record.body : '';
      if (!heading.trim() && !body.trim()) return null;
      return { heading, body };
    })
    .filter((item): item is PlatformGuideSection => item != null);
}

function mapDetail(raw: Record<string, unknown>): PlatformGuideDetail {
  return {
    id: String(raw.id),
    slug: String(raw.slug),
    title: String(raw.title ?? ''),
    summary: String(raw.summary ?? ''),
    icon: String(raw.icon ?? 'book-outline'),
    category: (raw.category as PlatformGuideCategory) ?? 'general',
    sections: parseSections(raw.sections),
    imageUrl: typeof raw.image_url === 'string' ? raw.image_url : null,
    videoUrl: typeof raw.video_url === 'string' ? raw.video_url : null,
    footerNote: typeof raw.footer_note === 'string' ? raw.footer_note : null,
    publishedAt: typeof raw.published_at === 'string' ? raw.published_at : null,
  };
}

export async function fetchPlatformGuides(): Promise<{
  data: PlatformGuideListItem[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('list_platform_guides');
  if (error) return { data: [], error: supabaseErrorMessage(error)! };
  return { data: ((data as ListRow[]) ?? []).map(mapListRow), error: null };
}

export async function fetchPlatformGuideBySlug(slug: string): Promise<{
  data: PlatformGuideDetail | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('get_platform_guide', { p_slug: slug });
  if (error) return { data: null, error: supabaseErrorMessage(error)! };
  if (!data || typeof data !== 'object') return { data: null, error: null };
  return { data: mapDetail(data as Record<string, unknown>), error: null };
}
