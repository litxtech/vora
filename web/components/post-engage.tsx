import Link from 'next/link';
import { addComment } from '@/lib/app-actions';
import { currentUser } from '@/lib/session';
import { createSessionClient } from '@/lib/supabase';

type CommentRow = {
  id: string;
  content: string | null;
  created_at: string;
  author_id: string;
};

export async function PostEngage({ postId }: { postId: string }) {
  const user = await currentUser();
  const supabase = await createSessionClient();
  const { data } = supabase
    ? await supabase
        .from('post_comments')
        .select('id, content, created_at, author_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(50)
    : { data: [] };
  const comments = (data ?? []) as CommentRow[];
  const authorIds = [...new Set(comments.map((comment) => comment.author_id))];
  const { data: authors } =
    supabase && authorIds.length
      ? await supabase.from('profiles').select('id, username, full_name').in('id', authorIds)
      : { data: [] };
  const names = new Map(
    ((authors ?? []) as { id: string; username: string | null; full_name: string | null }[]).map((person) => [
      person.id,
      person.full_name || (person.username ? `@${person.username}` : 'Üye'),
    ]),
  );

  return (
    <section>
      <h2>Yorumlar</h2>
      {comments.length === 0 ? <p className="muted">Henüz yorum yok.</p> : null}
      <ul>
        {comments.map((comment) => (
          <li key={comment.id}>
            <strong>{names.get(comment.author_id) ?? 'Üye'}</strong> {comment.content}
          </li>
        ))}
      </ul>
      {user ? (
        <form className="stack" action={addComment}>
          <input type="hidden" name="post_id" value={postId} />
          <label htmlFor="comment">Yorum yaz</label>
          <textarea id="comment" name="content" required maxLength={1000} />
          <button className="btn" type="submit">
            Gönder
          </button>
        </form>
      ) : (
        <p>
          Yorum yazmak için <Link href="/login">giriş yap</Link>.
        </p>
      )}
    </section>
  );
}
