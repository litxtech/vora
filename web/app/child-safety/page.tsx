import type { Metadata } from 'next';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Çocuk güvenliği',
  description: 'Vora yalnızca 18 yaş ve üzeri içindir. 18 yaş altı kullanım tespitinde hesap kapatılır.',
  path: '/child-safety',
  index: true,
  type: 'website',
});

export default function ChildSafetyPage() {
  return (
    <article className="block">
      <div className="wrap prose">
        <h1>Çocuk güvenliği</h1>
        <p>Vora yalnızca 18 yaş ve üzeri kullanıcılar içindir. 18 yaş altı kayıt, hesap veya kullanım yasaktır.</p>
        <p>Çocuk istismarı, çocuklara yönelik cinsel içerik, grooming ve sömürü sıfır toleransla kaldırılır ve yetkili mercilere bildirilebilir.</p>
        <p>18 yaş altı bir çocuğun platformu kullandığını düşünüyorsanız support@litxtech.com adresine yazın. Acil durumda yerel kolluk kuvvetlerine başvurun.</p>
        <p>Bilerek 18 yaş altı kişiden veri toplanmaz. Yanlışlıkla toplanan veri silinir.</p>
      </div>
    </article>
  );
}
