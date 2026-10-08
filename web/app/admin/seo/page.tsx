import { requireAdmin } from '@/lib/admin-auth';
import { listBlogPosts, listEvents, listPosts, postSeo } from '@/lib/data';
import { editorialPaths } from '@/lib/seo/routes';
import { isIndexableDeployment } from '@/lib/site';

export default async function AdminSeoPage() {
  await requireAdmin();
  const [posts, blogs, events] = await Promise.all([listPosts({ limit: 100 }), listBlogPosts('tr', 100), listEvents({ limit: 100 })]);
  const postScores = posts.map((post) => postSeo(post).score);
  const content = average(postScores);
  const indexability = posts.length === 0 ? 100 : Math.round((posts.filter((post) => postSeo(post).index).length / posts.length) * 100);
  const metadata = blogs.length === 0 ? 100 : Math.round((blogs.filter((post) => post.seo_title && post.seo_description).length / blogs.length) * 100);
  const linking = blogs.length === 0 ? 100 : Math.round((blogs.filter((post) => post.internal_links.length > 0 || post.city_slug).length / blogs.length) * 100);
  const technical = isIndexableDeployment() ? 100 : 70;
  return (
    <section>
      <h1>SEO sağlığı</h1>
      <p className="meta">Yüzdeler eldeki kayıtlardan hesaplanır. Kayıt yoksa ilgili başlık 100 sayılır çünkü eksik veri uydurulmaz.</p>
      <ul>
        <li>Technical SEO: {technical}%</li>
        <li>Content Quality: {content}%</li>
        <li>Indexability: {indexability}%</li>
        <li>Internal Linking: {linking}%</li>
        <li>Metadata: {metadata}%</li>
        <li>Sitemap: {isIndexableDeployment() ? 100 : 0}% (yalnızca PUBLIC_SITE_INDEXABLE=true iken dolar)</li>
      </ul>
      <p>Editoryal adres sayısı: {editorialPaths().length}</p>
      <p>Etkinlik kaydı: {events.length}</p>
      <h2>Paylaşım puanları</h2>
      <ul>
        {posts.slice(0, 20).map((post) => {
          const seo = postSeo(post);
          return (
            <li key={post.id}>
              {seo.score}/100 {seo.index ? 'index' : 'noindex'} — {post.id}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function average(values: number[]): number {
  if (values.length === 0) return 100;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
