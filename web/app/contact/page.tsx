import type { Metadata } from 'next';
import { sendContact } from '@/lib/actions';
import { toMetadata } from '@/lib/seo/engine';
import { SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = toMetadata({
  title: 'İletişim',
  description: 'Vora destek ekibine yazın. Destek adresi support@litxtech.com.',
  path: '/contact',
  index: true,
  type: 'website',
});

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const query = await searchParams;
  return (
    <section className="block">
      <div className="wrap">
        <h1>İletişim</h1>
        <p>
          Destek: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
        {query.sent ? <p>Mesajın alındı.</p> : null}
        {query.error ? <p>Mesaj gönderilemedi. Alanları kontrol edip yeniden dene.</p> : null}
        <form className="stack" action={sendContact}>
          <label htmlFor="name">Ad</label>
          <input id="name" name="name" required minLength={2} maxLength={80} />
          <label htmlFor="email">E-posta</label>
          <input id="email" name="email" type="email" required maxLength={160} />
          <label htmlFor="message">Mesaj</label>
          <textarea id="message" name="message" required minLength={10} maxLength={4000} />
          <label className="hp" htmlFor="company">
            Şirket
          </label>
          <input className="hp" id="company" name="company" tabIndex={-1} autoComplete="off" />
          <button className="btn" type="submit">
            Gönder
          </button>
        </form>
      </div>
    </section>
  );
}
