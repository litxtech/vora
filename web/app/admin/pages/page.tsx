import { savePage } from '@/lib/actions';
import { requireAdmin } from '@/lib/admin-auth';

export default async function PagesAdmin() {
  const supabase = await requireAdmin();
  const { data } = await supabase.from('web_pages').select('slug, title, status').order('slug');
  return (
    <section>
      <h1>Sayfalar</h1>
      <p className="meta">Gizlilik, koşullar, çocuk güvenliği, topluluk kuralları ve hesap silme kodda sabittir. CMS bunları değiştiremez.</p>
      <form className="stack" action={savePage}>
        <label htmlFor="slug">Slug</label>
        <input id="slug" name="slug" placeholder="about" required />
        <label htmlFor="title">Başlık</label>
        <input id="title" name="title" required />
        <label htmlFor="content_md">İçerik</label>
        <textarea id="content_md" name="content_md" />
        <label htmlFor="status">Durum</label>
        <select id="status" name="status" defaultValue="draft">
          <option value="draft">Taslak</option>
          <option value="published">Yayında</option>
        </select>
        <button className="btn" type="submit">
          Kaydet
        </button>
      </form>
      <ul>
        {(data ?? []).map((page) => (
          <li key={page.slug}>
            {page.slug} — {page.title} — {page.status}
          </li>
        ))}
      </ul>
    </section>
  );
}
