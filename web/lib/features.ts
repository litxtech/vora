export type FeaturePage = {
  slug: string;
  title: string;
  description: string;
  paragraphs: string[];
};

/** Yalnızca mobil uygulamada karşılığı olan özellikler. */
export const FEATURES: FeaturePage[] = [
  {
    slug: 'cities',
    title: 'Şehirler',
    description: 'Vora’da her Karadeniz ili kendi sayfasına, odasına ve topluluğuna sahiptir.',
    paragraphs: [
      'Uygulamada şehir, bir filtre değil bir kimliktir. Profil bir ile bağlanır; paylaşımlar, etkinlikler ve şehir odası bu bağın üstüne kurulur.',
      'Web’deki şehir sayfaları aynı illeri anlatır ve yalnızca herkese açık içeriği listeler.',
    ],
  },
  {
    slug: 'discover',
    title: 'Keşfet',
    description: 'Gönderiler, kısa videolar, etkinlikler ve şehirler tek akışta taranır.',
    paragraphs: [
      'Keşfet sekmesi gönderi, Reels, müzik, haber, etkinlik, işletme, iş ilanı ve otel başlıklarını ayrı sekmelerde toplar.',
      'Web’deki keşfet sayfası bunun herkese açık olan kısmını gösterir: şehirler, public paylaşımlar, blog ve etkinlikler.',
    ],
  },
  {
    slug: 'people',
    title: 'İnsanlar',
    description: 'Herkese açık profiller şehir ve ilgi alanıyla bulunabilir.',
    paragraphs: [
      'Vora’da profil görünürlüğü herkese açık, üyelere özel veya arkadaşlara özel olabilir. Web yalnızca herkese açık profilleri açar.',
      'Arama motorunda çıkmak ayrı bir tercihtir. Profil herkese açık olsa bile “Profilimi arama motorlarında göster” kapalıysa sayfa noindex kalır.',
    ],
  },
  {
    slug: 'posts',
    title: 'Paylaşımlar',
    description: 'Metin ve görsel gönderiler şehirle ilişkilidir.',
    paragraphs: [
      'Gönderinin kitlesi herkese açık, arkadaşlar veya yakın arkadaşlar olabilir. Web sayfası yalnızca herkese açık, yayında ve hassas olmayan gönderiler için üretilir.',
      'Silinen, gizlenen veya moderasyon bekleyen içerik 404 döner ve site haritasına girmez.',
    ],
  },
  {
    slug: 'stories',
    title: 'Hikayeler',
    description: 'Hikayeler kısa ömürlüdür ve kalıcı bir web sayfasına dönüştürülmez.',
    paragraphs: [
      'Uygulamadaki hikayeler süreli medyadır. Süresi dolan bir hikayeyi kalıcı SEO sayfası yapmak, kullanıcının beklentisine uymaz.',
      'Bu sayfa özelliği anlatır. Hikaye arşivi web’de dizine eklenmez.',
    ],
  },
  {
    slug: 'reels',
    title: 'Reels',
    description: 'Kısa videolar uygulama içindeki ayrı bir akışta izlenir.',
    paragraphs: [
      'Reels, gönderiden ayrı bir video biçimidir. Herkese açık ve uygun bulunan videolar zamanla public paylaşım sayfalarına bağlanabilir.',
      'Özel veya süresi kısıtlı video bu sitede yayımlanmaz.',
    ],
  },
  {
    slug: 'voice-rooms',
    title: 'Sesli odalar',
    description: 'Canlı sesli görüşme uygulama içindedir.',
    paragraphs: [
      'Sesli odalar anlıktır. Konuşma içeriği kayda alınıp web sayfasına çevrilmez.',
      'Bu sayfa yalnızca özelliğin ne işe yaradığını anlatır ve uygulamaya yönlendirir.',
    ],
  },
  {
    slug: 'city-rooms',
    title: 'Şehir odaları',
    description: 'Her ilin kendi canlı odası, o şehirle bağı olan kişileri aynı seste toplar.',
    paragraphs: [
      'Şehir odası, o ilin topluluğuna ait canlı sestir. Şehir liderliği ve meclis bu yapının yönetim yüzüdür.',
      'Web, oda kaydı yayınlamaz. İlgili şehir sayfasından uygulamanın şehir bölümüne geçilir.',
    ],
  },
  {
    slug: 'council',
    title: 'Meclis',
    description: 'Şehir meclisi, topluluk kararlarının uygulama içinde konuşulduğu yerdir.',
    paragraphs: [
      'Meclis, şehir yönetiminin parçasıdır. Gündem, oturum ve kararlar üyelerin gördüğü uygulama ekranlarında durur.',
      'Web’de kişisel oy, aday iletişim bilgisi veya kapalı oturum tutanağı yayımlanmaz.',
    ],
  },
  {
    slug: 'diplomacy',
    title: 'Diplomasi',
    description: 'İller birbirleriyle anlaşma ve ortak oda kurabilir.',
    paragraphs: [
      'Diplomasi, iki şehrin liderlik hattı üzerinden iletişim kurması ve ortak düzen kurması için vardır.',
      'Kapalı görüşmeler web’e taşınmaz. Açıklanan herkese açık şehir sayfaları ise ilgili illere bağlanır.',
    ],
  },
  {
    slug: 'events',
    title: 'Etkinlikler',
    description: 'Konser, festival, buluşma ve yerel etkinlikler şehirle listelenir.',
    paragraphs: [
      'Etkinlik Merkezi yaklaşan ve geçmiş etkinlikleri tutar. Yayındaki etkinlikler web’de kendi sayfasını alır.',
      'Geçmiş etkinlik silinmez; arşivde kalır. QR giriş jetonu ve hassas konum web sayfasına yazılmaz.',
    ],
  },
  {
    slug: 'notifications',
    title: 'Bildirimler',
    description: 'Bildirimler kişiseldir ve web’de listelenmez.',
    paragraphs: [
      'Beğeni, yorum, mesaj ve şehir duyuruları uygulama bildirimi olarak gider.',
      'Bildirim kutusu arama motoruna açık değildir.',
    ],
  },
  {
    slug: 'messages',
    title: 'Mesajlar',
    description: 'Özel mesajlar, gruplar ve aramalar yalnızca hesap sahibine görünür.',
    paragraphs: [
      'Mesajlaşma uçtan uca bir web arşivi değildir. Yazışmalar public sayfaya dönüşmez.',
      'Bu sayfa özelliği tanıtır. Gelen kutusu bu sitede yoktur.',
    ],
  },
];

export function featureBySlug(slug: string): FeaturePage | undefined {
  return FEATURES.find((feature) => feature.slug === slug);
}
