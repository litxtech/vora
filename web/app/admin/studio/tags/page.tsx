import { requireAdmin } from '@/lib/admin-auth';

export default async function TagsPage() {
  const supabase = await requireAdmin();
  const { data } = await supabase.from('web_blog_posts').select('tags').limit(200);
  const tags = new Map<string, number>();
  for (const row of data ?? []) {
    for (const tag of (row.tags as string[] | null) ?? []) tags.set(tag, (tags.get(tag) ?? 0) + 1);
  }
  return (
    <section>
      <h1>Etiketler</h1>
      <ul>
        {[...tags.entries()].map(([tag, count]) => (
          <li key={tag}>{tag} · {count}</li>
        ))}
      </ul>
    </section>
  );
}
