import { requireAdmin } from '@/lib/admin-auth';

export default async function AuthorsPage() {
  const supabase = await requireAdmin();
  const { data } = await supabase.from('web_blog_posts').select('author_name').limit(200);
  const names = [...new Set((data ?? []).map((row) => String(row.author_name || 'Vora')))];
  return (
    <section>
      <h1>Yazarlar</h1>
      <ul>{names.map((name) => <li key={name}>{name}</li>)}</ul>
    </section>
  );
}
