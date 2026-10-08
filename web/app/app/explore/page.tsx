import Link from 'next/link';
import { startChat } from '@/lib/app-actions';
import { cityById } from '@/lib/cities';
import { createSessionClient } from '@/lib/supabase';
import { requireProfile } from '@/lib/session';

type Person = { id: string; username: string | null; full_name: string | null; bio: string | null; region_id: string | null };
type Hit = { id: string; content: string | null; region_id: string | null };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { user } = await requireProfile();
  const { q } = await searchParams;
  const query = (q ?? '').trim();
  const supabase = await createSessionClient();
  let people: Person[] = [];
  let posts: Hit[] = [];
  if (query && supabase) {
    const like = `%${query.replace(/[%_,]/g, '')}%`;
    const [profileResult, postResult] = await Promise.all([
      supabase.from('profiles').select('id, username, full_name, bio, region_id').or(`username.ilike.${like},full_name.ilike.${like}`).limit(12),
      supabase.from('posts').select('id, content, region_id').eq('status', 'published').ilike('content', like).limit(12),
    ]);
    people = (profileResult.data ?? []) as Person[];
    posts = (postResult.data ?? []) as Hit[];
  }
  return (
    <>
      <h1>Keşfet</h1>
      <form className="stack" action="/app/explore">
        <label htmlFor="q">İnsan veya paylaşım ara</label>
        <input id="q" name="q" defaultValue={query} />
        <button className="btn" type="submit">
          Ara
        </button>
      </form>
      <div className="grid-2">
        <section>
          <h2>İnsanlar</h2>
          {people.length === 0 ? <p className="muted">Bir isim veya kullanıcı adı yaz.</p> : null}
          {people.map((person) => (
            <article className="card" key={person.id}>
              <h3>{person.full_name || person.username}</h3>
              <p className="meta">
                {person.username ? `@${person.username}` : ''}
                {person.region_id ? ` · ${cityById(person.region_id)?.name ?? ''}` : ''}
              </p>
              <p>{person.bio}</p>
              <div className="row-actions">
                {person.username ? <Link href={`/u/${person.username}`}>Profil</Link> : null}
                {person.id !== user.id ? (
                  <form action={startChat}>
                    <input type="hidden" name="user_id" value={person.id} />
                    <button className="btn ghost" type="submit">
                      Mesaj gönder
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </section>
        <section>
          <h2>Paylaşımlar</h2>
          {posts.map((post) => (
            <article className="card" key={post.id}>
              <p>{post.content}</p>
              <Link href={`/p/${post.id}`}>Aç</Link>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
