import { redirect } from 'next/navigation';
import { cancelDeletionAction, logoutAction } from '@/lib/auth-actions';
import { resolveWebAccess } from '@/lib/access-review';
import { requireProfile } from '@/lib/session';
import { createSessionClient } from '@/lib/supabase';

export default async function AccountAccessPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await requireProfile();
  const { error } = await searchParams;
  const supabase = await createSessionClient();
  if (!supabase) redirect('/login');
  const access = await resolveWebAccess(supabase, user.id);
  if (access.action === 'continue') redirect('/app');
  if (access.action === 'end') {
    await supabase.auth.signOut();
    redirect(`/login?access=${access.scenario}`);
  }

  return (
    <>
      <h1>Hesap silme süreci aktif</h1>
      <p className="muted">
        Silme talebin sürüyor. Tarih gelince verilerin kalıcı silinir. İptal edersen oturumun açık kalır ve uygulamaya devam edersin.
      </p>
      {error ? <p className="form-error">Talep iptal edilemedi. Tekrar dene.</p> : null}
      <div className="stack">
        {access.rows.map((row) => (
          <article className="card" key={row.label}>
            <p className="meta">{row.label}</p>
            <strong>{row.value}</strong>
          </article>
        ))}
      </div>
      <form action={cancelDeletionAction}>
        <button className="btn" type="submit">
          Silme talebini iptal et ve devam et
        </button>
      </form>
      <form action={logoutAction}>
        <button className="btn ghost" type="submit">
          Çıkış yap
        </button>
      </form>
    </>
  );
}
