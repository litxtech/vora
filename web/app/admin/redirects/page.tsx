import { saveRedirect } from '@/lib/actions';
import { requireAdmin } from '@/lib/admin-auth';

export default async function RedirectsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await requireAdmin();
  const query = await searchParams;
  const { data } = await supabase.from('web_redirects').select('id, from_path, to_path, status_code').order('created_at', { ascending: false });
  return (
    <section>
      <h1>301 yönlendirmeler</h1>
      {query.error ? <p>Kayıt reddedildi. Döngü veya geçersiz yol olabilir.</p> : null}
      <form className="stack" action={saveRedirect}>
        <label htmlFor="from_path">Eski yol</label>
        <input id="from_path" name="from_path" placeholder="/blog/eski-baslik" required />
        <label htmlFor="to_path">Yeni yol</label>
        <input id="to_path" name="to_path" placeholder="/blog/yeni-baslik" required />
        <button className="btn" type="submit">
          Ekle
        </button>
      </form>
      <ul>
        {(data ?? []).map((row) => (
          <li key={row.id}>
            {row.from_path} → {row.to_path} ({row.status_code})
          </li>
        ))}
      </ul>
    </section>
  );
}
