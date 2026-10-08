import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { slugifyTr } from '@/lib/blog/studio';

async function addCategory(formData: FormData) {
  'use server';
  const supabase = await requireAdmin();
  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 2) return;
  await supabase.from('web_blog_categories').insert({
    name,
    slug: slugifyTr(name),
    description: String(formData.get('description') ?? ''),
    language: 'tr',
  });
  revalidatePath('/admin/studio/categories');
}

export default async function CategoriesPage() {
  const supabase = await requireAdmin();
  const { data } = await supabase.from('web_blog_categories').select('id, name, slug').order('name');
  return (
    <section>
      <h1>Kategoriler</h1>
      <p>AI yeni kategori açmaz. Kategori yalnızca buradan eklenir.</p>
      <ul>{(data ?? []).map((item) => <li key={item.id}>{item.name}</li>)}</ul>
      <form action={addCategory} className="stack">
        <label htmlFor="name">Ad</label>
        <input id="name" name="name" required />
        <label htmlFor="description">Açıklama</label>
        <input id="description" name="description" />
        <button className="btn" type="submit">Ekle</button>
      </form>
    </section>
  );
}
