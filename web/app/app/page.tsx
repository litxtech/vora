import Link from 'next/link';
import { likePost } from '@/lib/app-actions';
import { cityById } from '@/lib/cities';
import { createSessionClient } from '@/lib/supabase';
import { requireProfile } from '@/lib/session';

type FeedPost = {
  id: string;
  content: string | null;
  created_at: string;
  region_id: string | null;
  author_id: string;
  audience: string | null;
  like_count: number | null;
  comment_count: number | null;
};

export default async function AppHomePage() {
  await requireProfile();
  const supabase = await createSessionClient();
  const { data } = await supabase!
    .from('posts')
    .select('id, content, created_at, region_id, author_id, audience, like_count, comment_count')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(30);
  const posts = (data ?? []) as FeedPost[];
  const authorIds = [...new Set(posts.map((post) => post.author_id))];
  const { data: authors } = authorIds.length
    ? await supabase!.from('profiles').select('id, username, full_name').in('id', authorIds)
    : { data: [] };
  const names = new Map(
    ((authors ?? []) as { id: string; username: string | null; full_name: string | null }[]).map((person) => [
      person.id,
      person.full_name || (person.username ? `@${person.username}` : 'Üye'),
    ]),
  );

  return (
    <>
      <h1 className="sr-only">Akış</h1>
      {posts.length === 0 ? (
        <p className="empty">Henüz paylaşım yok. İlk gönderini sen yaz.</p>
      ) : (
        <div className="feed-list">
          {posts.map((post) => {
            const name = names.get(post.author_id) ?? 'Üye';
            return (
              <article className="feed-card" key={post.id}>
                <span className="feed-avatar">{name.slice(0, 1).toUpperCase()}</span>
                <div className="feed-main">
                  <header className="feed-head">
                    <span className="feed-name">{name}</span>
                    <span className="feed-meta">
                      {post.region_id ? cityById(post.region_id)?.name : ''}
                      {post.audience === 'friends' ? ' · Arkadaşlar' : ''}
                    </span>
                  </header>
                  <p className="feed-copy">{post.content}</p>
                  <div className="feed-actions">
                    <Link href={`/p/${post.id}`} aria-label="Yorum">
                      Yorum{post.comment_count ? ` ${post.comment_count}` : ''}
                    </Link>
                    <form action={likePost}>
                      <input type="hidden" name="post_id" value={post.id} />
                      <button type="submit">Beğen{post.like_count ? ` ${post.like_count}` : ''}</button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
