import { requireProfile } from '@/lib/session';
import { createSessionClient } from '@/lib/supabase';

type Reel = {
  id: string;
  caption: string | null;
  like_count: number | null;
  comment_count: number | null;
};

export default async function ReelsPage() {
  await requireProfile();
  const supabase = await createSessionClient();
  const { data, error } = await supabase!
    .from('reels')
    .select('id, caption, like_count, comment_count')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20);
  const reels = (data ?? []) as Reel[];

  return (
    <>
      <h1>Reels</h1>
      <p className="muted">Dikey akış. Beğeni ve yorum sayıları uygulamadaki kayıtlardan gelir.</p>
      {error ? <p className="empty">Reels şu an açılamadı.</p> : null}
      {!error && reels.length === 0 ? <p className="empty">Yayındaki reel yok.</p> : null}
      <div className="reel-stack">
        {reels.map((reel) => (
          <article className="reel-card" key={reel.id}>
            <p>{reel.caption || 'Reel'}</p>
            <p className="meta">
              {reel.like_count ?? 0} beğeni · {reel.comment_count ?? 0} yorum
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
