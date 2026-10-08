import { revalidatePath } from 'next/cache';
import { adminContext } from '@/lib/blog/admin';
import { scoreArticle, slugifyTr, tokenOverlap, type ArticleDraft } from '@/lib/blog/studio';

const STATUSES = new Set(['draft', 'review', 'scheduled', 'published', 'archived', 'trash']);

function snapshot(draft: ArticleDraft) {
  return {
    title: draft.title,
    slug: draft.slug,
    excerpt: draft.excerpt,
    content: draft.content,
    seoTitle: draft.seoTitle,
    seoDescription: draft.seoDescription,
    status: draft.status,
  };
}

export async function POST(request: Request) {
  const admin = await adminContext();
  if (!admin) return Response.json({ error: 'Yetkisiz.' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { draft?: ArticleDraft; purge?: boolean; confirm?: string; source?: string } | null;
  if (!body?.draft) return Response.json({ error: 'Yazı yok.' }, { status: 400 });
  const draft = body.draft;
  if (body.purge) {
    if (body.confirm !== 'SIL' || !draft.id) return Response.json({ error: 'Kalıcı silme için SIL yazın.' }, { status: 400 });
    const { error } = await admin.supabase.from('web_blog_posts').delete().eq('id', draft.id);
    if (error) return Response.json({ error: 'Silinemedi.' }, { status: 400 });
    await admin.supabase.from('web_blog_audit').insert({ article_id: draft.id, actor_id: admin.userId, action: 'BLOG_DELETED', detail: { permanent: true } });
    return Response.json({ ok: true, purged: true });
  }
  const status = STATUSES.has(draft.status) ? draft.status : 'draft';
  const slug = slugifyTr(draft.slug || draft.title);
  if (!draft.title.trim() || !slug) return Response.json({ error: 'Başlık ve slug gerekli.' }, { status: 400 });
  if (status === 'published' && draft.content.trim().length < 80) {
    return Response.json({ error: 'Yayın için içerik çok kısa.', warnings: ['İçerik en az 80 karakter olmalı.'] }, { status: 400 });
  }
  if (status === 'scheduled' && !draft.scheduledAt) {
    return Response.json({ error: 'Zamanlama için tarih gerekli.' }, { status: 400 });
  }
  const score = scoreArticle({ ...draft, slug });
  const existing = draft.id
    ? (await admin.supabase.from('web_blog_posts').select('slug, status, content, published_at, updated_at').eq('id', draft.id).maybeSingle()).data
    : null;
  const contentChanged = !existing || String(existing.content ?? '') !== draft.content;
  const payload = {
    slug,
    language: draft.language || 'tr',
    title: draft.title.trim(),
    excerpt: draft.excerpt,
    content: draft.content,
    cover_image_url: draft.coverImageUrl || null,
    cover_image_alt: draft.coverImageAlt || null,
    video_url: draft.videoUrl || null,
    author_name: draft.authorName || admin.name,
    category_id: draft.categoryId || null,
    city_slug: draft.citySlug || null,
    tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 12),
    status,
    seo_title: draft.seoTitle || null,
    seo_description: draft.seoDescription || null,
    og_title: draft.ogTitle || null,
    og_description: draft.ogDescription || null,
    og_image_url: draft.coverImageUrl || null,
    faqs: draft.faqs,
    internal_links: draft.links,
    seo_canonical: draft.canonical || null,
    seo_indexable: draft.indexable,
    seo_score: score.score,
    field_modes: draft.fieldModes,
    search_intent: null,
    factual_notes: draft.factualNotes,
    quality_report: draft.quality,
    scheduled_at: draft.scheduledAt ? new Date(draft.scheduledAt).toISOString() : null,
    published_at: status === 'published' ? (existing?.published_at ?? new Date().toISOString()) : existing?.published_at ?? null,
    updated_at: contentChanged ? new Date().toISOString() : existing?.updated_at ?? new Date().toISOString(),
  };
  const duplicate = await admin.supabase
    .from('web_blog_posts')
    .select('id')
    .eq('language', payload.language)
    .eq('slug', slug)
    .neq('id', draft.id ?? '00000000-0000-0000-0000-000000000000')
    .maybeSingle();
  if (duplicate.data?.id) return Response.json({ error: 'Bu slug kullanılıyor.' }, { status: 409 });

  const saved = draft.id
    ? await admin.supabase.from('web_blog_posts').update(payload).eq('id', draft.id).select('id, updated_at').single()
    : await admin.supabase.from('web_blog_posts').insert({
      ...payload,
      created_by: admin.userId,
      generation_source: body.source === 'ai' ? 'ai' : 'manual',
      ai_generated_at: body.source === 'ai' ? new Date().toISOString() : null,
    }).select('id, updated_at').single();
  if (saved.error || !saved.data) return Response.json({ error: saved.error?.message || 'Kayıt başarısız.' }, { status: 400 });

  if (existing && existing.slug !== slug && (existing.status === 'published' || status === 'published')) {
    await admin.supabase.from('web_redirects').insert({ from_path: `/blog/${existing.slug}`, to_path: `/blog/${slug}`, status_code: 301 });
  }
  const previous = existing ? String(existing.content ?? '') : '';
  if (!existing || previous !== draft.content || String(existing.slug) !== slug || String(existing.status) !== status) {
    await admin.supabase.from('web_blog_revisions').insert({
      article_id: saved.data.id,
      snapshot,
      change_type: body.source === 'ai' ? 'ai' : status === 'published' ? 'published' : 'draft',
      changed_by: admin.userId,
    });
  }
  const audit = !existing ? 'BLOG_CREATED' : status === 'published' ? 'BLOG_PUBLISHED' : status === 'scheduled' ? 'BLOG_SCHEDULED' : status === 'trash' ? 'BLOG_DELETED' : 'BLOG_UPDATED';
  await admin.supabase.from('web_blog_audit').insert({ article_id: saved.data.id, actor_id: admin.userId, action: audit, detail: { status } });

  const { data: others } = await admin.supabase.from('web_blog_posts').select('id, title, slug').neq('id', saved.data.id).limit(40);
  const similar = (others ?? [])
    .map((row) => ({ id: String(row.id), title: String(row.title), slug: String(row.slug), score: tokenOverlap(draft.title, String(row.title)) }))
    .filter((row) => row.score >= 0.55)
    .slice(0, 3);

  revalidatePath('/blog');
  revalidatePath(`/blog/${slug}`);
  return Response.json({ id: saved.data.id, updatedAt: saved.data.updated_at, score, similar, warnings: score.checks.filter((item) => !item.ok).map((item) => item.label) });
}
