import { setSitemapExclusion } from '@/lib/actions';
import { requireAdmin } from '@/lib/admin-auth';
import { listBlogPosts, listEvents, listPosts, postSeo } from '@/lib/data';
import { loadSitemapCatalog } from '@/lib/seo/sitemapFeed';
import { absoluteUrl, isIndexableDeployment } from '@/lib/site';

export default async function AdminSeoPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  const [catalog, posts, blogs, events] = await Promise.all([
    loadSitemapCatalog(),
    listPosts({ limit: 100 }),
    listBlogPosts('tr', 100),
    listEvents({ limit: 100 }),
  ]);
  const live = isIndexableDeployment();
  const total = catalog.files.reduce((sum, file) => sum + file.entries.length, 0);

  return (
    <section>
      <h1>Sitemap XML</h1>
      <p className="meta">
        Yayına alınan blog, uygun paylaşım, profil ve etkinlik bir sonraki XML üretiminde kendiliğinden girer. Buradan çıkardığın adres sayfadan silinmez; yalnızca sitemap dosyasında yer almaz.
      </p>
      {error ? <p>İşlem kaydedilemedi. Adres kökten başlamalı ve soru işareti içermemeli.</p> : null}
      <p>
        Canlı indeks: <a href="/sitemap.xml">{absoluteUrl('/sitemap.xml')}</a>
        {live ? ' — arama motoruna açık.' : ' — PUBLIC_SITE_INDEXABLE=true olana kadar canlı XML boş döner. Aşağıdaki liste üretime girecek gerçek adreslerdir.'}
      </p>
      <p>XML içindeki adres: {total}. Çıkarılan: {catalog.excluded.length}.</p>

      {catalog.files.map((file) => (
        <details key={file.name} open={file.name === 'pages' || file.name === 'blog'}>
          <summary>
            {file.name}.xml — {file.entries.length} adres — <a href={file.href}>{absoluteUrl(file.href)}</a>
          </summary>
          {file.entries.length === 0 ? <p className="meta">Bu dosyada adres yok.</p> : null}
          <ul>
            {file.entries.map((entry) => (
              <li key={entry.path}>
                <a href={entry.path}>{entry.path}</a>
                {entry.lastmod ? <span className="meta"> · {entry.lastmod.slice(0, 10)}</span> : null}
                <form action={setSitemapExclusion} style={{ display: 'inline' }}>
                  <input type="hidden" name="path" value={entry.path} />
                  <input type="hidden" name="excluded" value="1" />
                  <button className="btn" type="submit">XML’den çıkar</button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      ))}

      <h2>XML’den çıkarılanlar</h2>
      {catalog.excluded.length === 0 ? <p className="meta">Çıkarılan adres yok. Yeni uygun sayfalar XML’de kalır.</p> : null}
      <ul>
        {catalog.excluded.map((path) => (
          <li key={path}>
            {path}
            <form action={setSitemapExclusion} style={{ display: 'inline' }}>
              <input type="hidden" name="path" value={path} />
              <input type="hidden" name="excluded" value="0" />
              <button className="btn" type="submit">XML’e geri al</button>
            </form>
          </li>
        ))}
      </ul>

      {catalog.unpublishedCms.length > 0 ? (
        <>
          <h2>Yayında olup XML’e alınmayan sayfalar</h2>
          <ul>
            {catalog.unpublishedCms.map((page) => (
              <li key={page.slug}>
                /{page.slug} — {page.reason}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2>Sağlık</h2>
      <ul>
        <li>Paylaşım kalitesi: {average(posts.map((post) => postSeo(post).score))}%</li>
        <li>Blog metadata: {blogs.length === 0 ? 100 : Math.round((blogs.filter((post) => post.seo_title && post.seo_description).length / blogs.length) * 100)}%</li>
        <li>Etkinlik kaydı: {events.length}</li>
      </ul>
    </section>
  );
}

function average(values: number[]): number {
  if (values.length === 0) return 100;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
