import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const supabase = await requireAdmin();
  const { status } = await searchParams;
  const filter = ['draft', 'review', 'scheduled', 'published', 'archived', 'trash'].includes(status ?? '') ? status : null;
  let query = supabase.from('web_blog_posts').select('id, title, slug, status, language, updated_at').order('updated_at', { ascending: false }).limit(100);
  if (filter) query = query.eq('status', filter);
  const { data } = await query;
  const rows = data ?? [];
  return (
    <section>
      <h1>Blog</h1>
      <p>
        <Link href="/admin/blog">Tümü</Link> · <Link href="/admin/blog?status=draft">Taslaklar</Link> ·{' '}
        <Link href="/admin/blog?status=published">Yayımlananlar</Link> · <Link href="/admin/blog?status=trash">Çöp</Link> ·{' '}
        <Link href="/admin/blog/new">Yeni yazı</Link>
      </p>
      <table>
        <thead>
          <tr>
            <th>Başlık</th>
            <th>Durum</th>
            <th>Dil</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link href={`/admin/blog/${row.id}`}>{row.title}</Link>
              </td>
              <td>{row.status}</td>
              <td>{row.language}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
