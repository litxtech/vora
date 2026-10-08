import type { Metadata } from 'next';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Hesap silme',
  description: 'Vora hesabı uygulama ayarlarından silinir. Talep 7 gün içinde geri dönüşsüz tamamlanır.',
  path: '/account-deletion',
  index: true,
  type: 'website',
});

export default function AccountDeletionPage() {
  return (
    <article className="block">
      <div className="wrap prose">
        <h1>Hesap silme</h1>
        <p>Hesap silme talebi uygulama ayarlarından açılır. Onay ifadesi uygulama içinde istenir.</p>
        <p>Talep alındıktan sonra 7 gün içinde kişisel veriler, gönderiler ve profil kayıtları geri dönüşsüz silinir. Yasal saklama yükümlülüğü kapsamındaki fatura kayıtları bu sürenin dışında kalabilir.</p>
        <p>Silinen herkese açık paylaşımın web adresi 404 döner ve site haritasından çıkar.</p>
        <p>Uygulamaya erişemiyorsanız support@litxtech.com adresine hesap e-postanızla yazın.</p>
      </div>
    </article>
  );
}
