import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { CITIES } from '@/lib/cities';
import { listBlogPosts, listEvents, listPosts, listProfiles, postSeo, profileSeo } from '@/lib/data';
import { editorialPaths } from '@/lib/seo/routes';

export default async function AdminHomePage() {
  await requireAdmin();
  const [posts, profiles, events, blogs] = await Promise.all([
    listPosts({ limit: 200 }),
    listProfiles(200),
    listEvents({ limit: 200 }),
    listBlogPosts('tr', 200),
  ]);
  const indexedPosts = posts.filter((post) => postSeo(post).index).length;
  const indexableProfiles = profiles.filter(
    (profile) => profileSeo(profile, posts.filter((post) => post.author_id === profile.id).length).index,
  ).length;
  const indexableEvents = events.filter((event) => event.description.trim().length >= 80).length;
  const publishedBlogs = blogs.length;
  const total = indexedPosts + indexableProfiles + CITIES.length + publishedBlogs + indexableEvents + editorialPaths().length;
  return (
    <section>
      <h1>SEO özeti</h1>
      <p className="meta">Sayımlar canlı veriden gelir. Kayıt yoksa sıfırdır.</p>
      <ul>
        <li>Dizine uygun herkese açık paylaşımlar: {indexedPosts}</li>
        <li>Dizine uygun profiller: {indexableProfiles}</li>
        <li>Şehir sayfaları: {CITIES.length}</li>
        <li>Yayımlanmış bloglar: {publishedBlogs}</li>
        <li>Dizine uygun etkinlikler: {indexableEvents}</li>
        <li>Toplam public SEO adayı: {total}</li>
      </ul>
      <p>
        <Link href="/admin/seo">SEO sağlığı</Link>
      </p>
    </section>
  );
}
