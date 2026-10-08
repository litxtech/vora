import { emptyDraft, type ArticleDraft, type FaqItem, type LinkItem } from '@/lib/blog/studio';

export function rowToDraft(row: Record<string, unknown> | null, authorName: string): ArticleDraft {
  if (!row) return emptyDraft(authorName);
  const modes = row.field_modes && typeof row.field_modes === 'object' ? (row.field_modes as ArticleDraft['fieldModes']) : {};
  return {
    ...emptyDraft(authorName),
    id: String(row.id),
    title: String(row.title ?? ''),
    slug: String(row.slug ?? ''),
    excerpt: String(row.excerpt ?? ''),
    content: String(row.content ?? ''),
    language: String(row.language ?? 'tr'),
    categoryId: typeof row.category_id === 'string' ? row.category_id : '',
    citySlug: typeof row.city_slug === 'string' ? row.city_slug : '',
    tags: Array.isArray(row.tags) ? (row.tags as string[]).join(', ') : '',
    status: String(row.status ?? 'draft'),
    coverImageUrl: typeof row.cover_image_url === 'string' ? row.cover_image_url : '',
    coverImageAlt: typeof row.cover_image_alt === 'string' ? row.cover_image_alt : '',
    videoUrl: typeof row.video_url === 'string' ? row.video_url : '',
    authorName: String(row.author_name ?? authorName),
    seoTitle: typeof row.seo_title === 'string' ? row.seo_title : '',
    seoDescription: typeof row.seo_description === 'string' ? row.seo_description : '',
    ogTitle: typeof row.og_title === 'string' ? row.og_title : '',
    ogDescription: typeof row.og_description === 'string' ? row.og_description : '',
    canonical: typeof row.seo_canonical === 'string' ? row.seo_canonical : '',
    indexable: row.seo_indexable !== false,
    faqs: Array.isArray(row.faqs) ? (row.faqs as FaqItem[]) : [],
    links: Array.isArray(row.internal_links) ? (row.internal_links as LinkItem[]) : [],
    scheduledAt: typeof row.scheduled_at === 'string' ? row.scheduled_at : '',
    fieldModes: modes,
    factualNotes: Array.isArray(row.factual_notes) ? (row.factual_notes as string[]) : [],
    quality: row.quality_report && typeof row.quality_report === 'object' ? (row.quality_report as Record<string, string>) : {},
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}
