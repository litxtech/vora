import type { Metadata } from 'next';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Gizlilik politikası',
  description: 'Vora kişisel verileri KVKK kapsamında LitxTech tarafından işler.',
  path: '/privacy',
  index: true,
  type: 'website',
});

export default function PrivacyPage() {
  return (
    <article className="block">
      <div className="wrap prose">
        <h1>Gizlilik politikası</h1>
        <p id="kvkk">
          Kişisel veriler 6698 sayılı KVKK kapsamında LitxTech tarafından veri sorumlusu sıfatıyla işlenir. Talepler için support@litxtech.com.
        </p>
        <h2>Toplanan veriler</h2>
        <p>Kayıt bilgileri, profil, izin verilirse konum, paylaşımlar, mesajlar ve cihaz oturumu uygulama içinde işlenebilir. Web’in herkese açık sayfaları e-posta, telefon, IBAN, tam koordinat ve özel mesaj içermez.</p>
        <h2>Amaç</h2>
        <p>Hesap, güvenlik, hizmetin sunulması ve yasal yükümlülükler. Konum ve bildirim cihaz iznine bağlıdır.</p>
        <h2>Haklar</h2>
        <p>Erişim, düzeltme, silme ve itiraz talepleri support@litxtech.com adresine yazılır.</p>
        <h2>Web dizini</h2>
        <p>Herkese açık profil, kullanıcı ayrıca izin vermedikçe arama motoru site haritasına girmez. Özel profiller 404 döner.</p>
      </div>
    </article>
  );
}
