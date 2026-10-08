import type { Metadata } from 'next';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Kullanım koşulları',
  description: 'Vora platformunu kullanırken geçerli kurallar. Hizmet 18 yaş ve üzeri içindir.',
  path: '/terms',
  index: true,
  type: 'website',
});

export default function TermsPage() {
  return (
    <article className="block">
      <div className="wrap prose">
        <h1>Kullanım koşulları</h1>
        <p>Vora, 18 yaş ve üzeri kullanıcılara yönelik bir sosyal platformdur. Hizmet LitxTech tarafından işletilir.</p>
        <h2>Sorumluluk</h2>
        <p>Paylaşımların doğruluğu ve üçüncü kişilerin haklarına saygı kullanıcıya aittir. Nefret, şiddet, taciz, dolandırıcılık, yasa dışı teşvik ve spam yasaktır.</p>
        <h2>Hesap</h2>
        <p>Hesap uygulama ayarlarından silme talebiyle kapatılabilir. Kurallara aykırı kullanımda hesap kısıtlanabilir.</p>
        <h2>Premium</h2>
        <p>İsteğe bağlı abonelik, sunulduğu mağazada o mağazanın kurallarıyla işler. Android’de uygulama içi abonelik satışı kapalı olabilir.</p>
        <p>Destek: support@litxtech.com</p>
      </div>
    </article>
  );
}
