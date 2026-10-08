import { requireAdmin } from '@/lib/admin-auth';
import { saveBlogPost } from '@/lib/actions';
import { CITIES } from '@/lib/cities';
import { absoluteUrl } from '@/lib/site';

type Params = { id: string };

export default async function BlogEditorPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await requireAdmin();
  const { data: categories } = await supabase.from('web_blog_categories').select('id, name, slug').order('name');
  const existing = id === 'new'
    ? null
    : (await supabase.from('web_blog_posts').select('*').eq('id', id).maybeSingle()).data;
  const post = existing as Record<string, unknown> | null;
  const title = String(post?.title ?? '');
  const slug = String(post?.slug ?? '');
  const description = String(post?.seo_description ?? post?.excerpt ?? '');
  const image = String(post?.og_image_url ?? post?.cover_image_url ?? '');
  return (
    <section>
      <h1>{id === 'new' ? 'Yeni yazı' : 'Yazıyı düzenle'}</h1>
      {query.error ? <p>Kayıt başarısız. JSON alanlarını kontrol edin.</p> : null}
      <form className="stack" action={saveBlogPost}>
        <input type="hidden" name="id" value={id} />
        <label htmlFor="title">Başlık</label>
        <input id="title" name="title" required defaultValue={title} />
        <label htmlFor="slug">Slug</label>
        <input id="slug" name="slug" required defaultValue={slug} />
        <label htmlFor="language">Dil</label>
        <select id="language" name="language" defaultValue={String(post?.language ?? 'tr')}>
          <option value="tr">Türkçe</option>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="es">Español</option>
        </select>
        <label htmlFor="excerpt">Özet</label>
        <textarea id="excerpt" name="excerpt" defaultValue={String(post?.excerpt ?? '')} />
        <label htmlFor="content">İçerik (markdown)</label>
        <textarea id="content" name="content" defaultValue={String(post?.content ?? '')} />
        <label htmlFor="cover_image_url">Kapak görseli</label>
        <input id="cover_image_url" name="cover_image_url" defaultValue={String(post?.cover_image_url ?? '')} />
        <label htmlFor="cover_image_alt">Kapak alt metni</label>
        <input id="cover_image_alt" name="cover_image_alt" defaultValue={String(post?.cover_image_alt ?? '')} />
        <label htmlFor="gallery">Galeri JSON</label>
        <textarea id="gallery" name="gallery" defaultValue={JSON.stringify(post?.gallery ?? [])} />
        <label htmlFor="video_url">Video (YouTube, Vimeo veya https mp4)</label>
        <input id="video_url" name="video_url" defaultValue={String(post?.video_url ?? '')} />
        <label htmlFor="author_name">Yazar</label>
        <input id="author_name" name="author_name" defaultValue={String(post?.author_name ?? 'Vora')} />
        <label htmlFor="city_slug">Şehir</label>
        <select id="city_slug" name="city_slug" defaultValue={String(post?.city_slug ?? '')}>
          <option value="">Yok</option>
          {CITIES.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        <label htmlFor="tags">Etiketler</label>
        <input id="tags" name="tags" defaultValue={Array.isArray(post?.tags) ? (post?.tags as string[]).join(', ') : ''} />
        <label htmlFor="status">Durum</label>
        <select id="status" name="status" defaultValue={String(post?.status ?? 'draft')}>
          <option value="draft">Taslak</option>
          <option value="published">Yayında</option>
          <option value="trash">Çöp</option>
        </select>
        <label htmlFor="seo_title">SEO başlığı</label>
        <input id="seo_title" name="seo_title" defaultValue={String(post?.seo_title ?? '')} />
        <label htmlFor="seo_description">Meta açıklama</label>
        <textarea id="seo_description" name="seo_description" defaultValue={description} />
        <label htmlFor="og_title">OG başlık</label>
        <input id="og_title" name="og_title" defaultValue={String(post?.og_title ?? '')} />
        <label htmlFor="og_description">OG açıklama</label>
        <textarea id="og_description" name="og_description" defaultValue={String(post?.og_description ?? '')} />
        <label htmlFor="og_image_url">OG görsel</label>
        <input id="og_image_url" name="og_image_url" defaultValue={image} />
        <label htmlFor="faqs">SSS JSON</label>
        <textarea id="faqs" name="faqs" defaultValue={JSON.stringify(post?.faqs ?? [])} />
        <label htmlFor="internal_links">İç bağlantılar JSON</label>
        <textarea id="internal_links" name="internal_links" defaultValue={JSON.stringify(post?.internal_links ?? [])} />
        <button className="btn" type="submit">
          Kaydet
        </button>
      </form>
      <aside className="card">
        <h2>Google önizleme</h2>
        <strong>{String(post?.seo_title || title || 'Başlık')}</strong>
        <p className="meta">{absoluteUrl(`/blog/${slug || 'slug'}`)}</p>
        <p>{description || 'Açıklama'}</p>
        <h2>Sosyal önizleme</h2>
        {image ? <img src={image} alt="" /> : <p className="meta">Görsel yok</p>}
        <p>{String(post?.og_title || title || 'Başlık')}</p>
      </aside>
      <h2>Kategoriler</h2>
      <ul>
        {(categories ?? []).map((category) => (
          <li key={category.id}>{category.name}</li>
        ))}
      </ul>
    </section>
  );
}
