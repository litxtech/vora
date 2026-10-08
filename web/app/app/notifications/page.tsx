import { markNotificationRead } from '@/lib/app-actions';
import { createSessionClient } from '@/lib/supabase';
import { requireProfile } from '@/lib/session';

type Notice = {
  id: string;
  title: string | null;
  body: string | null;
  created_at: string;
  read_at: string | null;
};

export default async function NotificationsPage() {
  const { user } = await requireProfile();
  const supabase = await createSessionClient();
  const { data } = await supabase!
    .from('notifications')
    .select('id, title, body, created_at, read_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(40);
  const rows = (data ?? []) as Notice[];
  return (
    <>
      <h1>Bildirimler</h1>
      {rows.length === 0 ? (
        <p className="empty">Yeni bildirimin yok.</p>
      ) : (
        <div className="stack">
          {rows.map((row) => (
            <article className="card" key={row.id}>
              <h2>{row.title || 'Bildirim'}</h2>
              <p>{row.body}</p>
              <p className="meta">{new Date(row.created_at).toLocaleString('tr-TR')}</p>
              {row.read_at ? null : (
                <form action={markNotificationRead}>
                  <input type="hidden" name="id" value={row.id} />
                  <button className="btn ghost" type="submit">
                    Okundu
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
