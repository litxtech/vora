import type { Metadata } from 'next';
import { StoreBadges } from '@/components/site';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Uygulamayı indir',
  description: 'Vora, App Store ve Google Play’de. Karadeniz şehirleri için sosyal platform.',
  path: '/download',
  index: true,
  type: 'website',
});

export default function DownloadPage() {
  return (
    <section className="block">
      <div className="wrap prose">
        <h1>Vora’yı indir</h1>
        <p>Sesli odalar, mesajlar, meclis ve şehir yönetimi uygulamada. Web, herkese açık yüzeyi okutur.</p>
        <StoreBadges />
      </div>
    </section>
  );
}
