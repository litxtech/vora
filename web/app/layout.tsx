import type { Metadata } from 'next';
import { Analytics } from '@/components/analytics';
import { OpenInApp } from '@/components/open-in-app';
import { SiteFooter, SiteHeader } from '@/components/site';
import { graph, organizationLd, softwareLd, websiteLd } from '@/lib/seo/engine';
import { isIndexableDeployment, siteUrl, SITE_NAME } from '@/lib/site';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME} — Karadeniz'in canlı dijital ağı`, template: `%s · ${SITE_NAME}` },
  description: 'Vora; Karadeniz şehirlerinde insanları, paylaşımları, şehir odalarını ve etkinlikleri bir araya getiren sosyal platformdur.',
  robots: isIndexableDeployment() ? { index: true, follow: true } : { index: false, follow: false },
  icons: { icon: '/vora-logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = graph([organizationLd(), websiteLd(), softwareLd()]);
  return (
    <html lang="tr">
      <body>
        <a className="skip" href="#icerik">
          İçeriğe geç
        </a>
        <SiteHeader />
        <main id="icerik">{children}</main>
        <SiteFooter />
        <OpenInApp />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Analytics />
      </body>
    </html>
  );
}
