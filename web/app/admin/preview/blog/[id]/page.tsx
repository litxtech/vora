import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { parseVideo, renderMarkdown } from '@/lib/markdown';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DraftPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await requireAdmin();
  const { data } = await supabase.from('web_blog_posts').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const post = data as Record<string, unknown>;
  const video = parseVideo(typeof post.video_url === 'string' ? post.video_url : null);
  const faqs = Array.isArray(post.faqs) ? (post.faqs as { question?: string; answer?: string }[]) : [];
  return (
    <article className="block">
      <div className="wrap prose">
        <p className="meta">Önizleme · noindex · {String(post.status)}</p>
        <h1>{String(post.title)}</h1>
        <p className="meta">{String(post.author_name)}</p>
        {typeof post.cover_image_url === 'string' ? <img src={post.cover_image_url} alt={String(post.cover_image_alt ?? '')} /> : null}
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(String(post.content ?? '')) }} />
        {video?.kind === 'youtube' ? <iframe title={String(post.title)} src={`https://www.youtube.com/embed/${video.id}`} sandbox="allow-scripts allow-same-origin allow-presentation" width="100%" height="360" /> : null}
        {faqs.filter((item) => item.question && item.answer).map((item) => (
          <section key={item.question}>
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </section>
        ))}
        <p><Link href={`/admin/blog/${id}`}>Editöre dön</Link></p>
      </div>
    </article>
  );
}
