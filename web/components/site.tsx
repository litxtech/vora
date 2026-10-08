import Link from 'next/link';
import { CopyLink } from '@/components/copy-link';
import { CITIES } from '@/lib/cities';
import { FEATURES } from '@/lib/features';
import type { BreadcrumbItem } from '@/lib/seo/engine';
import { logoutAction } from '@/lib/auth-actions';
import { currentProfile } from '@/lib/session';
import { StoreBadges } from '@/components/store-badges';

export { StoreBadges };
import { ANDROID_PLAY_STORE_URL, IOS_APP_STORE_URL, SUPPORT_EMAIL } from '@/lib/site';

export async function SiteHeader() {
  const session = await currentProfile();
  const label = session?.profile?.full_name || session?.profile?.username || 'Hesabım';
  return (
    <header className="site-header">
      <div className="wrap header-bar">
        <Link className="brand" href="/">
          <img src="/vora-logo.png" alt="" width={40} height={40} />
          Vora
        </Link>
        <input id="nav-toggle" className="nav-toggle" type="checkbox" />
        <label className="nav-burger" htmlFor="nav-toggle">
          Menü
        </label>
        <nav className="nav-links" aria-label="Ana menü">
          <Link href="/cities">Şehirler</Link>
          <Link href="/explore">Keşfet</Link>
          <Link href="/events">Etkinlikler</Link>
          <Link href="/blog">Blog</Link>
          {session ? (
            <>
              <Link className="btn" href="/app">
                {label}
              </Link>
              <form action={logoutAction}>
                <button className="btn ghost" type="submit">
                  Çıkış yap
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Giriş yap</Link>
              <Link className="btn" href="/register">
                Kayıt ol
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <h2>Vora</h2>
          <ul>
            <li><Link href="/about">Vora nedir?</Link></li>
            <li><Link href="/about">Hakkımızda</Link></li>
            <li><Link href="/features">Özellikler</Link></li>
            <li><Link href="/contact">İletişim</Link></li>
          </ul>
        </div>
        <div>
          <h2>Keşfet</h2>
          <ul>
            <li><Link href="/cities">Şehirler</Link></li>
            <li><Link href="/people">İnsanlar</Link></li>
            <li><Link href="/posts">Herkese açık paylaşımlar</Link></li>
            <li><Link href="/events">Etkinlikler</Link></li>
            <li><Link href="/blog">Blog</Link></li>
          </ul>
        </div>
        <div>
          <h2>Destek</h2>
          <ul>
            <li><Link href="/help">Yardım merkezi</Link></li>
            <li><Link href="/help#sss">SSS</Link></li>
            <li><Link href="/contact">İletişim</Link></li>
            <li><Link href="/account-deletion">Hesap silme</Link></li>
          </ul>
        </div>
        <div>
          <h2>Yasal</h2>
          <ul>
            <li><Link href="/privacy">Gizlilik politikası</Link></li>
            <li><Link href="/terms">Kullanım koşulları</Link></li>
            <li><Link href="/community-rules">Topluluk kuralları</Link></li>
            <li><Link href="/child-safety">Çocuk güvenliği</Link></li>
            <li><Link href="/privacy#kvkk">KVKK</Link></li>
          </ul>
        </div>
        <div>
          <h2>Uygulama</h2>
          <ul>
            <li><a href={IOS_APP_STORE_URL}>App Store</a></li>
            <li><a href={ANDROID_PLAY_STORE_URL}>Google Play</a></li>
            <li><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></li>
          </ul>
        </div>
      </div>
      <div className="wrap legal-note">
        <p>Vora, LitxTech tarafından işletilen 18 yaş ve üzeri bir sosyal platformdur. © {new Date().getFullYear()} Vora</p>
      </div>
    </footer>
  );
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="crumbs" aria-label="Sayfa yolu">
      {items.map((item, index) => (
        <span key={item.path}>
          {index > 0 ? ' / ' : null}
          {index === items.length - 1 ? item.name : <Link href={item.path}>{item.name}</Link>}
        </span>
      ))}
    </nav>
  );
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export function CtaBand() {
  return (
    <section className="block">
      <div className="wrap panel">
        <h2>Vora’yı telefonuna indir</h2>
        <p>Karadeniz’deki şehir odalarına, herkese açık paylaşımlara ve etkinliklere uygulamadan devam et.</p>
        <StoreBadges />
      </div>
    </section>
  );
}

export function CityLinks({ ids }: { ids?: string[] }) {
  const cities = ids ? CITIES.filter((city) => ids.includes(city.id)) : CITIES;
  return (
    <div className="city-cloud">
      {cities.map((city) => (
        <Link key={city.id} href={`/city/${city.id}`}>
          {city.name}
        </Link>
      ))}
    </div>
  );
}

export function FeatureLinks() {
  return (
    <div className="grid-3">
      {FEATURES.map((feature) => (
        <Link className="card" key={feature.slug} href={`/features/${feature.slug}`}>
          <h3>{feature.title}</h3>
          <p className="meta">{feature.description}</p>
        </Link>
      ))}
    </div>
  );
}

export function ShareBar({ path, title }: { path: string; title: string }) {
  const url = path;
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title);
  return (
    <div className="share">
      <a href={`https://wa.me/?text=${text}%20${encoded}`}>WhatsApp</a>
      <a href={`https://t.me/share/url?url=${encoded}&text=${text}`}>Telegram</a>
      <a href={`https://twitter.com/intent/tweet?url=${encoded}&text=${text}`}>X</a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}>Facebook</a>
      <CopyLink url={url} />
    </div>
  );
}
