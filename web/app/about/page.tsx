import type { Metadata } from 'next';
import { getPageOverride } from '@/lib/data';
import { renderMarkdown } from '@/lib/markdown';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Hakkımızda',
  description: 'Vora, Karadeniz şehirlerinde insanların birbirini ve şehrini bulması için LitxTech tarafından işletilir.',
  path: '/about',
  index: true,
  type: 'website',
});

export default async function AboutPage() {
  const override = await getPageOverride('about');
  return (
    <article className="block">
      <div className="wrap prose">
        <h1>Vora nedir?</h1>
        {override ? (
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(override) }} />
        ) : (
          <>
            <p>
              Vora, Karadeniz şehirlerini merkeze alan bir sosyal keşif ve iletişim platformudur. Amaç, büyük ve kimliksiz bir akışta kaybolmak değil; yaşadığın ilin nabzını, komşularını ve şehir odasını aynı yerde görmektir.
            </p>
            <h2>Neyi çözmek istiyor?</h2>
            <p>
              Yeni bir ile taşınmak, memleketteki bağı uzaktan sürdürmek veya kendi şehrinde olan biteni kaçırmamak dağınık araçlara bölünür. Vora bunları tek hesapta toplar: paylaşım, mesaj, etkinlik, şehir odası, meclis ve diplomasi.
            </p>
            <h2>Kime hizmet eder?</h2>
            <p>
              Platform 18 yaş ve üzeri kullanıcılar içindir. Karadeniz illerindeki topluluklar esas kitledir. Çocuklara yönelik hesap açılmaz.
            </p>
            <h2>Vizyon</h2>
            <p>Şehir kimliğini kaybetmeden, başka illerle de konuşabilen bir Karadeniz ağı.</p>
            <h2>Misyon</h2>
            <p>Herkese açık olanı okunur kılmak, özel olanı özel bırakmak ve şehir yönetimini uygulamanın içinde tutmak.</p>
            <p>Vora, LitxTech tarafından işletilir. Destek: support@litxtech.com</p>
          </>
        )}
      </div>
    </article>
  );
}
