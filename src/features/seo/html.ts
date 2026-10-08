import { escapeHtml, jsonLdSafe } from '@/features/seo/text';
import type { SeoPage, SiteConfig } from '@/features/seo/types';

const NAV = [
  { href: '/', text: 'Ana sayfa' },
  { href: '/ozellikler', text: 'Özellikler' },
  { href: '/sehirler', text: 'Şehirler' },
  { href: '/kesfet', text: 'Keşfet' },
  { href: '/blog', text: 'Blog' },
  { href: '/etkinlikler', text: 'Etkinlikler' },
  { href: '/indir', text: 'İndir' },
];

const FOOTER = [
  ...NAV,
  { href: '/hakkinda', text: 'Hakkında' },
  { href: '/yardim', text: 'Yardım' },
  { href: '/gizlilik', text: 'Gizlilik' },
  { href: '/kosullar', text: 'Koşullar' },
];

/** İlk HTML yanıtı içeriği taşır. İçerik için JavaScript gerekmez. */
export function renderDocument(page: SeoPage, config: SiteConfig): string {
  const robots = `<meta name="robots" content="${escapeHtml(page.robots)}" />`;
  const canonical = page.canonical ? `<link rel="canonical" href="${escapeHtml(page.canonical)}" />` : '';
  const hreflang = page.hreflang
    .map((link) => `<link rel="alternate" hreflang="${escapeHtml(link.hreflang)}" href="${escapeHtml(link.href)}" />`)
    .join('\n');
  const og = Object.entries(page.openGraph)
    .map(([key, value]) => `<meta property="${escapeHtml(key)}" content="${escapeHtml(value)}" />`)
    .join('\n');
  const twitter = Object.entries(page.twitter)
    .map(([key, value]) => `<meta name="${escapeHtml(key)}" content="${escapeHtml(value)}" />`)
    .join('\n');
  const jsonLd = page.jsonLd.map((block) => `<script type="application/ld+json">${jsonLdSafe(block)}</script>`).join('\n');
  const paragraphs = page.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n');
  const sections = page.sections
    .map(
      (section) => `<section>
        <h2>${escapeHtml(section.heading)}</h2>
        ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n')}
      </section>`,
    )
    .join('\n');
  const images = page.images
    .map((image, index) => {
      const size = image.width && image.height ? ` width="${image.width}" height="${image.height}"` : '';
      const loading = index === 0 ? 'eager' : 'lazy';
      return `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}"${size} loading="${loading}" decoding="async" />`;
    })
    .join('\n');
  const video = page.video
    ? `<video controls playsinline preload="metadata" poster="${escapeHtml(page.video.thumbnailUrl)}">
        <source src="${escapeHtml(page.video.contentUrl)}" />
      </video>`
    : '';
  const crumbs =
    page.breadcrumbs.length > 1
      ? `<nav aria-label="İçerik yolu"><ol>${page.breadcrumbs
          .map((crumb, index) =>
            index === page.breadcrumbs.length - 1
              ? `<li aria-current="page">${escapeHtml(crumb.name)}</li>`
              : `<li><a href="${escapeHtml(crumb.path)}">${escapeHtml(crumb.name)}</a></li>`,
          )
          .join('')}</ol></nav>`
      : '';
  const related =
    page.links.length > 0
      ? `<aside><h2>İlgili sayfalar</h2><ul>${page.links
          .map((link) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.text)}</a></li>`)
          .join('')}</ul></aside>`
      : '';
  const stores = [
    config.iosStoreUrl ? `<a class="btn" href="${escapeHtml(config.iosStoreUrl)}">App Store</a>` : '',
    config.androidStoreUrl ? `<a class="btn" href="${escapeHtml(config.androidStoreUrl)}">Google Play</a>` : '',
  ].join('');
  const download =
    page.path === '/indir' || page.path === '/'
      ? `<p><a class="btn" href="/indir">Vora’yı indir</a></p>${stores ? `<p class="stores">${stores}</p>` : ''}`
      : '';
  const search =
    page.path === '/ara'
      ? `<form action="/ara" method="get" role="search"><label for="q">Arama</label><input id="q" name="q" type="search" minlength="2" /><button type="submit">Ara</button></form>`
      : '';
  const legal = [
    page.path === '/gizlilik' && config.privacyPolicyUrl
      ? `<p><a href="${escapeHtml(config.privacyPolicyUrl)}">Gizlilik metninin tamamı</a></p>`
      : '',
    page.path === '/kosullar' && config.termsUrl
      ? `<p><a href="${escapeHtml(config.termsUrl)}">Kullanım koşullarının tamamı</a></p>`
      : '',
  ].join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}" />
  ${robots}
  ${canonical}
  ${hreflang}
  ${og}
  ${twitter}
  ${jsonLd}
  <style>${CSS}</style>
</head>
<body>
  <a class="skip" href="#icerik">İçeriğe geç</a>
  <header>
    <a class="logo" href="/">Vora</a>
    <nav aria-label="Ana menü">
      <ul>${NAV.map((item) => `<li><a href="${item.href}">${item.text}</a></li>`).join('')}</ul>
    </nav>
  </header>
  <main id="icerik">
    ${crumbs}
    <article>
      <h1>${escapeHtml(page.h1)}</h1>
      ${page.authorName ? `<p class="meta">${escapeHtml(page.authorName)}${page.cityName ? ` · ${escapeHtml(page.cityName)}` : ''}</p>` : ''}
      ${page.publishedAt ? `<p class="meta"><time datetime="${escapeHtml(page.publishedAt)}">${escapeHtml(page.publishedAt.slice(0, 10))}</time></p>` : ''}
      ${search}
      ${paragraphs}
      ${sections}
      ${images}
      ${video}
      ${legal}
      ${download}
    </article>
    ${related}
  </main>
  <footer>
    <nav aria-label="Alt menü"><ul>${FOOTER.map((item) => `<li><a href="${item.href}">${item.text}</a></li>`).join('')}</ul></nav>
    <p>Vora · Karadeniz sosyal uygulaması</p>
  </footer>
</body>
</html>`;
}

const CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; color: #142033; background: #f6f8fb; line-height: 1.55; }
a { color: #0b5cab; }
.skip { position: absolute; left: -999px; }
.skip:focus { left: 8px; top: 8px; background: #fff; padding: 8px; }
header, footer, main { width: min(880px, calc(100% - 32px)); margin: 0 auto; }
header { display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: center; padding: 16px 0; }
.logo { font-weight: 800; text-decoration: none; color: #0b5cab; font-size: 1.25rem; }
nav ul, aside ul, footer ul { display: flex; flex-wrap: wrap; gap: 8px 14px; list-style: none; padding: 0; margin: 0; }
nav a, .btn, button { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 2px; }
main { padding-bottom: 32px; }
article, aside { background: #fff; border: 1px solid #d7e0ea; border-radius: 16px; padding: 20px; margin: 12px 0; }
h1 { font-size: 1.8rem; line-height: 1.25; margin: 0 0 12px; }
h2 { font-size: 1.2rem; margin: 20px 0 8px; }
img, video { max-width: 100%; height: auto; border-radius: 12px; }
.meta { color: #4b5b70; font-size: 0.95rem; }
.stores { display: flex; gap: 12px; flex-wrap: wrap; }
.btn { background: #0b5cab; color: #fff; text-decoration: none; border-radius: 12px; padding: 10px 14px; }
button { background: #0b5cab; color: #fff; border: 0; border-radius: 12px; padding: 10px 14px; }
input { min-height: 44px; width: min(100%, 420px); border: 1px solid #9aafc4; border-radius: 10px; padding: 8px 10px; }
footer { padding: 12px 0 40px; color: #4b5b70; }
`;
