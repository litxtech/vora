import { requireAdmin } from '@/lib/admin-auth';

export default async function MediaPage() {
  const supabase = await requireAdmin();
  const { data } = await supabase.from('web_media').select('id, filename, alt, caption, public_url').order('created_at', { ascending: false }).limit(50);
  return (
    <section>
      <h1>Medya</h1>
      <p className="meta">Yükleme `web-media` kovasına yapılır. SVG kabul edilmez. Yalnızca jpeg, png, webp ve mp4.</p>
      <MediaUpload />
      <ul>
        {(data ?? []).map((item) => (
          <li key={item.id}>
            {item.filename} — {item.alt || 'alt yok'} — {item.caption || 'açıklama yok'}
          </li>
        ))}
      </ul>
    </section>
  );
}

function MediaUpload() {
  return (
    <form className="stack" action="/api/admin/media" method="post" encType="multipart/form-data">
      <label htmlFor="file">Dosya</label>
      <input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4" required />
      <label htmlFor="alt">Alt metin</label>
      <input id="alt" name="alt" />
      <label htmlFor="caption">Alt yazı</label>
      <input id="caption" name="caption" />
      <button className="btn" type="submit">
        Yükle
      </button>
    </form>
  );
}
