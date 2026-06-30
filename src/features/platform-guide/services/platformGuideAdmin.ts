import { supabaseErrorMessage } from '@/lib/errors/userFacingError';
import { supabase } from '@/lib/supabase/client';
import type {
  PlatformGuideAdminRow,
  PlatformGuideCategory,
  PlatformGuideDraft,
  PlatformGuideSection,
} from '@/features/platform-guide/types';

type DbRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  icon: string;
  category: string;
  sections: unknown;
  image_url: string | null;
  video_url: string | null;
  footer_note: string | null;
  sort_order: number;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function parseSections(raw: unknown): PlatformGuideSection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      return {
        heading: typeof record.heading === 'string' ? record.heading : '',
        body: typeof record.body === 'string' ? record.body : '',
      };
    })
    .filter((item): item is PlatformGuideSection => item != null);
}

function mapAdminRow(row: DbRow): PlatformGuideAdminRow {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    icon: row.icon,
    category: row.category as PlatformGuideCategory,
    sections: parseSections(row.sections),
    imageUrl: row.image_url,
    videoUrl: row.video_url,
    footerNote: row.footer_note,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchAdminPlatformGuides(): Promise<{
  data: PlatformGuideAdminRow[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_list_platform_guides');
  if (error) return { data: [], error: supabaseErrorMessage(error)! };
  return { data: ((data as DbRow[]) ?? []).map(mapAdminRow), error: null };
}

export async function savePlatformGuide(draft: PlatformGuideDraft): Promise<{
  id: string | null;
  error: string | null;
}> {
  const sections = draft.sections
    .map((section) => ({
      heading: section.heading.trim(),
      body: section.body.trim(),
    }))
    .filter((section) => section.heading || section.body);

  const { data, error } = await supabase.rpc('admin_save_platform_guide', {
    p_id: draft.id,
    p_slug: draft.slug.trim().toLowerCase(),
    p_title: draft.title.trim(),
    p_summary: draft.summary.trim(),
    p_icon: draft.icon,
    p_category: draft.category,
    p_sections: sections,
    p_image_url: draft.imageUrl,
    p_video_url: draft.videoUrl,
    p_footer_note: draft.footerNote.trim() || null,
    p_sort_order: draft.sortOrder,
    p_is_published: draft.isPublished,
  });

  if (error) return { id: null, error: supabaseErrorMessage(error)! };
  return { id: String(data), error: null };
}

export async function publishPlatformGuide(
  id: string,
  notify: boolean,
): Promise<{ recipientCount: number; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_publish_platform_guide', {
    p_id: id,
    p_notify: notify,
  });
  if (error) return { recipientCount: 0, error: supabaseErrorMessage(error)! };
  return { recipientCount: (data as number) ?? 0, error: null };
}

export async function deletePlatformGuide(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_delete_platform_guide', { p_id: id });
  return { error: error ? supabaseErrorMessage(error)! : null };
}

export async function previewPlatformGuideRecipients(): Promise<{
  count: number;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_preview_platform_guide_recipients');
  if (error) return { count: 0, error: supabaseErrorMessage(error)! };
  return { count: (data as number) ?? 0, error: null };
}
