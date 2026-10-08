import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';

async function restoreRevision(formData: FormData) {
  'use server';
  const supabase = await requireAdmin();
  const articleId = String(formData.get('article_id') ?? '');
  const revisionId = String(formData.get('revision_id') ?? '');
  const { data } = await supabase.from('web_blog_revisions').select('snapshot').eq('id', revisionId).eq('article_id', articleId).maybeSingle();
  const snapshot = data?.snapshot as { title?: string; slug?: string; excerpt?: string; content?: string; seoTitle?: string; seoDescription?: string } | null;
  if (!snapshot?.title || !snapshot.slug) return;
  await supabase.from('web_blog_posts').update({
    title: snapshot.title,
    slug: snapshot.slug,
    excerpt: snapshot.excerpt ?? '',
    content: snapshot.content ?? '',
    seo_title: snapshot.seoTitle ?? null,
    seo_description: snapshot.seoDescription ?? null,
    status: 'draft',
    updated_at: new Date().toISOString(),
  }).eq('id', articleId);
  revalidatePath(`/admin/blog/${articleId}`);
}

export default async function RevisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await requireAdmin();
  const { data: article } = await supabase.from('web_blog_posts').select('id, title').eq('id', id).maybeSingle();
  if (!article) notFound();
  const { data } = await supabase.from('web_blog_revisions').select('id, change_type, created_at').eq('article_id', id).order('created_at', { ascending: false }).limit(30);
  return (
    <section>
      <h1>Sürümler</h1>
      <p><Link href={`/admin/blog/${id}`}>{article.title}</Link></p>
      <ul>
        {(data ?? []).map((row) => (
          <li key={row.id}>
            {row.change_type} · {new Date(String(row.created_at)).toLocaleString('tr-TR')}
            <form action={restoreRevision}>
              <input type="hidden" name="article_id" value={id} />
              <input type="hidden" name="revision_id" value={row.id} />
              <button type="submit">Restore</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
