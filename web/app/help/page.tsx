import type { Metadata } from 'next';
import { toMetadata } from '@/lib/seo/engine';

const ARTICLES = [
  { id: 'hesap', title: 'Hesap', body: 'Kayıt 18 yaş beyanı, kullanım şartları, gizlilik ve çocuk koruma onayını gerektirir. Misafir hesaplar herkese açık web profiline çıkmaz.' },
  { id: 'profil', title: 'Profil', body: 'Görünürlük herkese açık, üyelere özel veya arkadaşlara özel olabilir. “Profilimi arama motorlarında göster” ayrıca kapatılabilir.' },
  { id: 'paylasim', title: 'Paylaşımlar', body: 'Kitle herkese açık, arkadaşlar veya yakın arkadaşlar olabilir. Web yalnızca herkese açık ve yayındaki paylaşımları açar.' },
  { id: 'mesaj', title: 'Mesajlar', body: 'Özel mesajlar ve gruplar web’de listelenmez.' },
  { id: 'sehir', title: 'Şehirler', body: 'Profil bir Karadeniz iline bağlanır. Şehir sayfaları bu kimliği anlatır.' },
  { id: 'oda', title: 'Şehir odaları', body: 'Canlı ses odası uygulama içindedir. Konuşma kaydı web’e yazılmaz.' },
  { id: 'etkinlik', title: 'Etkinlikler', body: 'Yayındaki etkinliklerin herkese açık bilgisi web’de durur. QR giriş jetonu paylaşılmaz.' },
  { id: 'guvenlik', title: 'Güvenlik', body: 'Taciz, spam ve çocuk güvenliği ihlalleri uygulama içinden veya support@litxtech.com adresinden bildirilir.' },
  { id: 'gizlilik', title: 'Gizlilik', body: 'E-posta, telefon, IBAN ve tam konum web sayfalarına yazılmaz.' },
  { id: 'teknik', title: 'Teknik sorunlar', body: 'Uygulama açılmıyorsa sürümü ve cihazı belirterek support@litxtech.com adresine yazın.' },
];

export const metadata: Metadata = toMetadata({
  title: 'Yardım merkezi',
  description: 'Hesap, profil, paylaşım, şehir odası, etkinlik ve gizlilik hakkında yanıtlar.',
  path: '/help',
  index: true,
  type: 'website',
});

export default function HelpPage() {
  return (
    <section className="block">
      <div className="wrap prose">
        <h1>Yardım merkezi</h1>
        {ARTICLES.map((article) => (
          <section key={article.id} id={article.id}>
            <h2>{article.title}</h2>
            <p>{article.body}</p>
          </section>
        ))}
        <h2 id="sss">Sık sorulanlar</h2>
        <h3>Vora nedir?</h3>
        <p>Karadeniz şehirleri için sosyal keşif ve iletişim uygulamasıdır.</p>
        <h3>Vora nasıl çalışır?</h3>
        <p>Hesap açılır, bir il seçilir, paylaşım ve şehir odası o ilin etrafında toplanır.</p>
        <h3>Vora ücretsiz mi?</h3>
        <p>Uygulamayı indirmek ücretsizdir. Premium, sunulduğu platformlarda isteğe bağlı bir aboneliktir.</p>
        <h3>Hangi şehirlerde kullanılabilir?</h3>
        <p>Şehir listesi Karadeniz illerini kapsar. Ayrıntı şehirler sayfasındadır.</p>
        <h3>Nasıl insan bulurum?</h3>
        <p>Herkese açık profiller ve keşfet akışı kullanılır. Özel profiller arama sonucunda da açılmaz.</p>
        <h3>Şehir odaları nedir?</h3>
        <p>Bir ilin canlı sesli ortak alanıdır.</p>
        <h3>Nasıl paylaşım yapılır?</h3>
        <p>Uygulamadaki oluşturma ekranından. Kitleyi herkese açık seçmezsen web sayfası oluşmaz.</p>
        <h3>Hesabımı nasıl silerim?</h3>
        <p>Uygulama ayarlarından silme talebi açılır. 7 gün içinde veriler geri dönüşsüz silinir. Ayrıntı hesap silme sayfasındadır.</p>
      </div>
    </section>
  );
}
