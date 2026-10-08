import type { Metadata } from 'next';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Topluluk kuralları',
  description: 'Vora topluluğunda nefret, şiddet, taciz, spam ve çocuklara yönelik zararlı içerik yasaktır.',
  path: '/community-rules',
  index: true,
  type: 'website',
});

export default function CommunityRulesPage() {
  return (
    <article className="block">
      <div className="wrap prose">
        <h1>Topluluk kuralları</h1>
        <p>Vora 18 yaş ve üzeri bir topluluktur. Date ve İzdivaç da bu yaş sınırının içindedir.</p>
        <ul>
          <li>Taciz, tehdit, nefret söylemi ve şiddet içeriği kaldırılır.</li>
          <li>Spam, sahte hesap ve dolandırıcılık bildirilir.</li>
          <li>Çocuklara yönelik cinsel içerik ve grooming sıfır toleransla kapatılır ve yetkili mercilere bildirilebilir.</li>
          <li>Başkasının özel mesajını herkese açık paylaşıma taşımak yasaktır.</li>
        </ul>
        <p>İhlali uygulama içinden veya support@litxtech.com adresinden bildirin.</p>
      </div>
    </article>
  );
}
