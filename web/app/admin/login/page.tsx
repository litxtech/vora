import { signInAdmin } from '@/lib/actions';

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return (
    <section>
      <h1>Yönetici girişi</h1>
      <p className="meta">Mevcut Vora hesabı ve admin rolü gerekir. Ayrı bir üyelik sistemi yoktur.</p>
      {query.error ? <p>Giriş başarısız.</p> : null}
      <form className="stack" action={signInAdmin}>
        <label htmlFor="email">E-posta</label>
        <input id="email" name="email" type="email" required />
        <label htmlFor="password">Şifre</label>
        <input id="password" name="password" type="password" required />
        <button className="btn" type="submit">
          Giriş
        </button>
      </form>
    </section>
  );
}
