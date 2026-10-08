import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, CtaBand, JsonLd } from '@/components/site';
import { cityById } from '@/lib/cities';
import { displayName, getProfile, listPosts, postHeadline, profileSeo } from '@/lib/data';
import { breadcrumbLd, graph, toMetadata, trimDescription } from '@/lib/seo/engine';
import { absoluteUrl } from '@/lib/site';

type Params = { username: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) return { title: 'Profil bulunamadı', robots: { index: false, follow: false } };
  const posts = await listPosts({ limit: 20 });
  const own = posts.filter((post) => post.author_id === profile.id);
  const seo = profileSeo(profile, own.length);
  return toMetadata({
    title: `${displayName(profile.full_name, profile.username)} (@${profile.username})`,
    description: trimDescription(profile.bio || `${profile.username} Vora profili`),
    path: `/u/${profile.username}`,
    index: seo.index,
    type: 'profile',
    image: profile.avatar_url,
  });
}

export default async function ProfilePage({ params }: { params: Promise<Params> }) {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) notFound();
  const posts = (await listPosts({ limit: 30 })).filter((post) => post.author_id === profile.id);
  const city = cityById(profile.region_id ?? '');
  const crumbs = [
    { name: 'Ana sayfa', path: '/' },
    { name: 'İnsanlar', path: '/people' },
    { name: `@${profile.username}`, path: `/u/${profile.username}` },
  ];
  return (
    <article className="block">
      <JsonLd
        data={graph([
          breadcrumbLd(crumbs),
          {
            '@type': 'Person',
            name: displayName(profile.full_name, profile.username),
            alternateName: profile.username,
            description: profile.bio ?? undefined,
            url: absoluteUrl(`/u/${profile.username}`),
            image: profile.avatar_url ?? undefined,
            homeLocation: city ? { '@type': 'Place', name: city.name } : undefined,
          },
        ])}
      />
      <div className="wrap">
        <Breadcrumbs items={crumbs} />
        {profile.avatar_url ? <img src={profile.avatar_url} alt="" width={96} height={96} /> : null}
        <h1>{displayName(profile.full_name, profile.username)}</h1>
        <p className="meta">@{profile.username}</p>
        <p>{profile.bio || 'Herkese açık biyografi yok.'}</p>
        {city ? (
          <p>
            Şehir: <Link href={`/city/${city.id}`}>{city.name}</Link>
          </p>
        ) : null}
        {profile.interests.length > 0 ? <p>İlgi alanları: {profile.interests.join(', ')}</p> : null}
        <h2>Paylaşımlar</h2>
        {posts.length === 0 ? (
          <p className="empty">Listelenecek herkese açık paylaşım yok.</p>
        ) : (
          <ul>
            {posts.map((post) => (
              <li key={post.id}>
                <Link href={`/p/${post.id}`}>{postHeadline(post)}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <CtaBand />
    </article>
  );
}
