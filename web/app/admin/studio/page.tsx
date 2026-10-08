import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';

export default async function StudioDashboard() {
  const supabase = await requireAdmin();
  const due = new Date().toISOString();
  await supabase.from('web_blog_posts').update({ status: 'published', published_at: due }).eq('status', 'scheduled').lte('scheduled_at', due);
  const { data } = await supabase.from('web_blog_posts').select('id, title, author_name, language, status, seo_score, updated_at, generation_source').order('updated_at', { ascending: false }).limit(20);
  const rows = data ?? [];
  async function count(status: string) {
    const result = await supabase.from('web_blog_posts').select('id', { count: 'exact', head: true }).eq('status', status);
    return result.count ?? 0;
  }
  const [published, drafts, scheduled] = await Promise.all([count('published'), count('draft'), count('scheduled')]);
  const { data: scoreRows } = await supabase.from('web_blog_posts').select('seo_score').not('seo_score', 'is', null).limit(200);
  const scores = (scoreRows ?? []).map((row) => Number(row.seo_score ?? 0)).filter((score) => score > 0);
  const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  const { data: usage } = await supabase.from('web_ai_generation_logs').select('estimated_cost, input_tokens, output_tokens').limit(200);
  const cost = (usage ?? []).reduce((sum, row) => sum + Number(row.estimated_cost ?? 0), 0);
  return (
    <section className="studio">
      <h1>Blog Studio</h1>
      <nav className="studio-nav" aria-label="Blog Studio">
        <Link href="/admin/studio">Dashboard</Link>
        <Link href="/admin/blog">Posts</Link>
        <Link href="/admin/blog/new">New Post</Link>
        <Link href="/admin/studio/write">AI Writer</Link>
        <Link href="/admin/blog?status=draft">Drafts</Link>
        <Link href="/admin/blog?status=scheduled">Scheduled</Link>
        <Link href="/admin/blog?status=published">Published</Link>
        <Link href="/admin/studio/categories">Categories</Link>
        <Link href="/admin/studio/tags">Tags</Link>
        <Link href="/admin/studio/authors">Authors</Link>
        <Link href="/admin/media">Media</Link>
        <Link href="/admin/seo">SEO</Link>
        <Link href="/admin/studio/settings">Settings</Link>
      </nav>
      <div className="studio-stats">
        <article><span>Published</span><strong>{published}</strong></article>
        <article><span>Drafts</span><strong>{drafts}</strong></article>
        <article><span>Scheduled</span><strong>{scheduled}</strong></article>
        <article><span>SEO Score</span><strong>{average}/100</strong></article>
      </div>
      <p className="meta">AI tahmini maliyet (son kayıtlar): ${cost.toFixed(4)}. Sıralama garantisi yoktur.</p>
      <table>
        <thead>
          <tr>
            <th>Başlık</th>
            <th>Yazar</th>
            <th>Dil</th>
            <th>SEO</th>
            <th>Durum</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 20).map((row) => (
            <tr key={row.id}>
              <td><Link href={`/admin/blog/${row.id}`}>{row.title}</Link></td>
              <td>{row.author_name}</td>
              <td>{row.language}</td>
              <td>{row.seo_score ?? '—'}</td>
              <td>{row.status}</td>
              <td>{new Date(String(row.updated_at)).toLocaleString('tr-TR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
