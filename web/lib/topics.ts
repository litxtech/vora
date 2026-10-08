export type TopicPage = {
  slug: string;
  title: string;
  description: string;
  paragraphs: string[];
  category: string | null;
};

export const TOPICS: TopicPage[] = [
  {
    slug: 'karadeniz',
    title: 'Karadeniz',
    description: 'Vora’nın merkezindeki kıyı ve iç kesim illeri, tek bir bölge kimliği olarak.',
    category: null,
    paragraphs: [
      'Vora’nın şehir listesi Karadeniz coğrafyasına göre kuruludur: kıyıdaki liman kentleri, yayla illeri ve iç ovadaki duraklar aynı ağın parçasıdır.',
      'Bölge tek tip değildir. Rize’nin yağmuru ile Çorum’un ovası, Trabzon’un çarşısı ile Bayburt’un rüzgârı aynı cümlede anlatılamaz. Şehir sayfaları bu yüzden ayrı yazılır.',
      'Herkese açık paylaşımlar bir ile bağlıdır. Konu sayfası ise o ilin dışındaki ortak başlıkları bir araya getirir.',
    ],
  },
  {
    slug: 'sosyal-yasam',
    title: 'Sosyal yaşam',
    description: 'Yeni bir Karadeniz kentinde günün nasıl kurulduğu.',
    category: 'daily',
    paragraphs: [
      'Sosyal yaşam burada çoğu zaman büyük bir mekan değil, tekrar eden bir saattir. Aynı çay ocağı, aynı sahil turu, aynı şehir odası.',
      'Kıyı kentlerinde hava planı değiştirir ama iptal ettirmez. İç kesimlerde mesafe uzundur; bir düğün veya panayır aylarca sürecek selamın başlangıcı olabilir.',
      'Vora bu ritmi uydurmaz. Herkese açık paylaşımlar, o hafta hangi şehirde ne konuşulduğunu gösterir.',
    ],
  },
  {
    slug: 'gezi',
    title: 'Gezi',
    description: 'Yayla, vadi ve kıyıyı aynı güne sıkıştırmadan gezmek.',
    category: 'entertainment',
    paragraphs: [
      'Karadeniz’de bir rota, haritada kısa görünüp yolda uzayabilir. Şelale merdiveni, yayla yolu ve şehir çarşısı ayrı tempolardır.',
      'Bu sayfa gezi niyetini toplar. Ayrıntı, ilgili şehrin kendi gezilecek yerler yazısındadır; aynı paragraf her ile kopyalanmaz.',
      'Kalabalık yaz günlerinde erken saat, öğleden sonraki otopark kuyruğundan daha çok yer gördürür.',
    ],
  },
  {
    slug: 'arkadaslik',
    title: 'Arkadaşlık',
    description: 'Yeni bir çevrede bağ kurmanın acele edilmeyen hali.',
    category: null,
    paragraphs: [
      'Vora’da arkadaşlık, karşılıklı takiptir. Yakın arkadaşlar ayrı bir listedir. Bu ayrımlar gönderinin kim tarafından görüleceğini belirler.',
      'Web, arkadaşlara özel gönderiyi açmaz. Tanışmak için görünen yüz, kişinin bilinçli olarak herkese bıraktığı profil ve paylaşımdır.',
      'Çevrimiçi tanışılan biriyle buluşmadan önce herkese açık bir mekân ve kendi ulaşımınızı seçmek, sohbeti daha güvenli bir zemine indirir.',
    ],
  },
  {
    slug: 'etkinlikler',
    title: 'Etkinlikler',
    description: 'Festival, konser ve şehir buluşmalarının herkese açık listesi.',
    category: 'event',
    paragraphs: [
      'Etkinlik, şehir takviminin görünür kısmıdır. Aksu gibi bir festival haftası ile sıradan bir salı akşamı aynı yoğunlukta değildir.',
      'Vora’da yayındaki etkinlikler şehirle listelenir. Geçmiş olanlar silinmez; arşivde kalır.',
      'Kapalı davet, QR giriş jetonu ve hassas konum bu sayfalara yazılmaz.',
    ],
  },
];

export function topicBySlug(slug: string): TopicPage | undefined {
  return TOPICS.find((topic) => topic.slug === slug);
}
