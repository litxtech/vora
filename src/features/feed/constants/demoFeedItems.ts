import type { FeedAuthor, FeedItem } from '@/features/feed/types';
import type { UserRole } from '@/types/database';

function hoursAgo(hours: number): string {
  return new Date(Date.now() - 1000 * 60 * 60 * hours).toISOString();
}

function reporter(
  id: string,
  username: string,
  fullName: string,
  verified = true,
): FeedAuthor {
  return {
    id,
    username,
    fullName,
    avatarUrl: null,
    role: (verified ? 'verified_reporter' : 'user') as UserRole,
    isVerified: verified,
  };
}

function newsItem(params: {
  id: string;
  author: FeedAuthor;
  title: string;
  content: string;
  regionId: string;
  district: string;
  locationLabel: string;
  latitude?: number;
  longitude?: number;
  hoursAgo: number;
  likeCount?: number;
  commentCount?: number;
  viewCount?: number;
  isFollowing?: boolean;
}): FeedItem {
  return {
    id: params.id,
    sourceType: 'post',
    sourceId: params.id,
    author: params.author,
    title: params.title,
    content: params.content,
    mediaUrls: [],
    category: 'news',
    regionId: params.regionId,
    district: params.district,
    locationLabel: params.locationLabel,
    latitude: params.latitude ?? null,
    longitude: params.longitude ?? null,
    likeCount: params.likeCount ?? 48,
    commentCount: params.commentCount ?? 12,
    quoteCount: 4,
    saveCount: 18,
    viewCount: params.viewCount ?? 1200,
    createdAt: hoursAgo(params.hoursAgo),
    isLiked: false,
    isSaved: false,
    isFollowing: params.isFollowing ?? false,
    quotedPost: null,
    isDemo: true,
  };
}

const TRABZON = reporter('demo-author-trabzon', 'trabzon_gundem', 'Trabzon Gündem');
const RIZE = reporter('demo-author-rize', 'rize_haber', 'Rize Haber Merkezi');
const GIRESUN = reporter('demo-author-giresun', 'giresun_ajans', 'Giresun Ajans');
const SAMSUN = reporter('demo-author-samsun', 'samsun_sesi', 'Samsun Sesi');
const ORDU = reporter('demo-author-ordu', 'ordu_yerel', 'Ordu Yerel Haber');
const ARTVIN = reporter('demo-author-artvin', 'artvin_bulten', 'Artvin Bülten');

export const DEMO_FEED_ITEMS: FeedItem[] = [
  // — Trabzon haberler —
  newsItem({
    id: 'demo-news-trabzon-1',
    author: TRABZON,
    title: 'Karadeniz Sahil Yolu\'nda gece bakım çalışması',
    content:
      'Trabzon–Rize kesiminde 23:00–05:00 arası tek şerit uygulaması yapılacak. Ortahisar çıkışından Hopa yönüne giden sürücülerin alternatif güzergâhları kontrol etmesi öneriliyor.',
    regionId: 'trabzon',
    district: 'Ortahisar',
    locationLabel: 'Karadeniz Sahil Yolu',
    latitude: 41.012,
    longitude: 39.698,
    hoursAgo: 2,
    likeCount: 214,
    commentCount: 41,
    viewCount: 4800,
  }),
  newsItem({
    id: 'demo-news-trabzon-2',
    author: TRABZON,
    title: 'Boztepe teleferik hattında bahar yoğunluğu',
    content:
      'Hafta sonu Boztepe\'ye çıkan ziyaretçi sayısı geçen yıla göre %30 arttı. Belediye ek sefer düzenledi; sıra bekleme süresi ortalama 25 dakikaya indi.',
    regionId: 'trabzon',
    district: 'Ortahisar',
    locationLabel: 'Boztepe',
    latitude: 40.992,
    longitude: 39.732,
    hoursAgo: 5,
    viewCount: 3100,
  }),
  newsItem({
    id: 'demo-news-trabzon-3',
    author: reporter('demo-author-akcaabat', 'akcaabat_haber', 'Akçaabat Haber'),
    title: 'Akçaabat köfte festivali tarihi açıklandı',
    content:
      'Geleneksel Akçaabat Köfte Festivali bu yıl 14–16 Haziran\'da Sahil Park alanında düzenlenecek. Yerli ve yabancı turistler için stant başvuruları 1 Mayıs\'ta başlıyor.',
    regionId: 'trabzon',
    district: 'Akçaabat',
    locationLabel: 'Akçaabat Sahil Park',
    latitude: 41.021,
    longitude: 39.569,
    hoursAgo: 9,
    viewCount: 2200,
  }),
  newsItem({
    id: 'demo-news-trabzon-4',
    author: TRABZON,
    title: 'Değirmendere\'de dere ıslah çalışması',
    content:
      'Yağışlı havalarda taşkın riskini azaltmak için Değirmendere yatağında temizlik ve duvar güçlendirme çalışması başlatıldı. Çalışma süresince yürüyüş parkurunun bir bölümü geçici kapalı.',
    regionId: 'trabzon',
    district: 'Ortahisar',
    locationLabel: 'Değirmendere',
    hoursAgo: 14,
    viewCount: 980,
  }),

  // — Rize —
  newsItem({
    id: 'demo-news-rize-1',
    author: RIZE,
    title: 'Ayder Yaylası yolunda ulaşım normale dönüyor',
    content:
      'Kış aylarında biriken kar kalınlığı azaldı. Çamlıhemşin–Ayder hattında zincir takma zorunluluğu kaldırıldı; minibüs seferleri tam kapasite devam ediyor.',
    regionId: 'rize',
    district: 'Çamlıhemşin',
    locationLabel: 'Ayder Yaylası',
    latitude: 40.951,
    longitude: 41.098,
    hoursAgo: 3,
    viewCount: 3600,
  }),
  newsItem({
    id: 'demo-news-rize-2',
    author: RIZE,
    title: '2026 çay alım fiyatları açıklandı',
    content:
      'Rize Ticaret Borsası\'na göre yaş çay kilogram fiyatı geçen sezona göre %8 artışla belirlendi. Üreticilerin randevulu teslimat sistemi 20 Nisan\'da devreye girecek.',
    regionId: 'rize',
    district: 'Merkez',
    locationLabel: 'Rize Ticaret Borsası',
    hoursAgo: 7,
    viewCount: 5100,
  }),
  newsItem({
    id: 'demo-news-rize-3',
    author: RIZE,
    title: 'Fırtına Vadisi rafting sezonu açılıyor',
    content:
      'Su debisinin güvenli seviyeye gelmesiyle birlikte Fırtına Deresi\'nde rehberli rafting turları 15 Nisan\'da başlayacak. İlk hafta rezervasyonlar %60 oranında doldu.',
    regionId: 'rize',
    district: 'Çamlıhemşin',
    locationLabel: 'Fırtına Vadisi',
    hoursAgo: 11,
    viewCount: 1800,
  }),

  // — Giresun —
  newsItem({
    id: 'demo-news-giresun-1',
    author: GIRESUN,
    title: 'Giresun Adası turlarına ek sefer',
    content:
      'Bahara girilmesiyle Giresun Adası feribot seferleri hafta içi 4, hafta sonu 6 sefere çıkarıldı. Adada restorasyon çalışması tamamlanan tarihi yapılar ziyarete açıldı.',
    regionId: 'giresun',
    district: 'Merkez',
    locationLabel: 'Giresun Adası İskelesi',
    latitude: 40.917,
    longitude: 38.389,
    hoursAgo: 4,
    viewCount: 2900,
  }),
  newsItem({
    id: 'demo-news-giresun-2',
    author: GIRESUN,
    title: 'Tirebolu balık halinde hamsi bolluğu',
    content:
      'Karadeniz\'de avlanan hamsi miktarı arttı; Tirebolu balık halinde kilogram fiyatları geçen haftaya göre 15–20 TL geriledi. Restoranlar menülerine taze hamsi tava ekledi.',
    regionId: 'giresun',
    district: 'Tirebolu',
    locationLabel: 'Tirebolu Balık Hali',
    hoursAgo: 8,
    viewCount: 1400,
  }),

  // — Samsun —
  newsItem({
    id: 'demo-news-samsun-1',
    author: SAMSUN,
    title: 'Atakum sahil yürüyüş yolunda aydınlatma yenilendi',
    content:
      'Atakum Belediyesi 4 km\'lik sahil bandında LED aydınlatma ve bisiklet yolu çizgilerini yeniledi. Çalışmalar gece 01:00–05:00 arasında yapılacak.',
    regionId: 'samsun',
    district: 'Atakum',
    locationLabel: 'Atakum Sahil',
    latitude: 41.347,
    longitude: 36.252,
    hoursAgo: 6,
    viewCount: 2700,
  }),
  newsItem({
    id: 'demo-news-samsun-2',
    author: SAMSUN,
    title: 'Terme\'de fındık bahçelerinde bahar budama uyarısı',
    content:
      'Ziraat mühendisleri, Terme ovasında don riski geçene kadar ağır budamadan kaçınılmasını öneriyor. Ücretsiz tarla danışmanlığı için ilçe tarım müdürlüğüne başvurulabilir.',
    regionId: 'samsun',
    district: 'Terme',
    locationLabel: 'Terme Ovası',
    hoursAgo: 12,
    viewCount: 890,
  }),

  // — Ordu —
  newsItem({
    id: 'demo-news-ordu-1',
    author: ORDU,
    title: 'Perşembe Yaylası kar şenliği programı belli oldu',
    content:
      'Perşembe Belediyesi\'nin düzenlediği kar şenliğinde yerel müzik grupları, kızak parkuru ve yöresel ürün stantları yer alacak. Etkinlik 12–14 Nisan tarihlerinde yapılacak.',
    regionId: 'ordu',
    district: 'Perşembe',
    locationLabel: 'Perşembe Yaylası',
    hoursAgo: 5,
    viewCount: 1950,
  }),
  newsItem({
    id: 'demo-news-ordu-2',
    author: ORDU,
    title: 'Altınordu sahilinde hafta sonu yoğunluğu',
    content:
      'Güneşli havanın etkisiyle Altınordu sahilinde piknik alanları erken saatlerden itibaren doldu. Belediye ek çöp toplama ve WC temizliği ekibi görevlendirdi.',
    regionId: 'ordu',
    district: 'Altınordu',
    locationLabel: 'Altınordu Sahil',
    hoursAgo: 10,
    viewCount: 1100,
  }),

  // — Artvin —
  newsItem({
    id: 'demo-news-artvin-1',
    author: ARTVIN,
    title: 'Kafkasör Yaylası\'na kontrollü ulaşım açıldı',
    content:
      'Kar erimesi tamamlandı; Artvin–Kafkasör hattında sabah 08:00–18:00 arası kontrollü geçiş uygulanıyor. Kamp alanları 1 Mayıs\'ta hizmete girecek.',
    regionId: 'artvin',
    district: 'Merkez',
    locationLabel: 'Kafkasör Yaylası',
    hoursAgo: 4,
    viewCount: 1650,
  }),

  // — Diğer kategoriler (Trabzon) —
  {
    id: 'demo-post-1',
    sourceType: 'post',
    sourceId: 'demo-post-1',
    author: TRABZON,
    title: 'Meydan trafik kazası',
    content: "Trabzon Meydan'da iki araç çarpıştı. Yol tek şeride düştü, ekipler olay yerinde.",
    mediaUrls: [],
    category: 'traffic',
    regionId: 'trabzon',
    district: 'Ortahisar',
    locationLabel: 'Trabzon Meydan',
    latitude: 41.0015,
    longitude: 39.7178,
    likeCount: 128,
    commentCount: 34,
    quoteCount: 12,
    saveCount: 45,
    viewCount: 2840,
    createdAt: hoursAgo(0.3),
    isLiked: false,
    isSaved: false,
    isFollowing: false,
    quotedPost: null,
    isDemo: true,
  },
  {
    id: 'demo-post-2',
    sourceType: 'post',
    sourceId: 'demo-post-2',
    author: reporter('demo-author-yomra', 'yomra_gundem', 'Yomra Gündem', false),
    title: null,
    content: 'Yomra sahilinde bu akşam canlı müzik etkinliği var. #Yomra #Etkinlik',
    mediaUrls: [],
    category: 'event',
    regionId: 'trabzon',
    district: 'Yomra',
    locationLabel: 'Yomra Sahil',
    latitude: 40.9589,
    longitude: 39.8567,
    likeCount: 56,
    commentCount: 8,
    quoteCount: 3,
    saveCount: 21,
    viewCount: 920,
    createdAt: hoursAgo(0.9),
    isLiked: false,
    isSaved: false,
    isFollowing: true,
    quotedPost: null,
    isDemo: true,
  },
  {
    id: 'demo-post-3',
    sourceType: 'post',
    sourceId: 'demo-post-3',
    author: reporter('demo-author-is', 'karadeniz_is', 'Karadeniz İş'),
    title: 'Otel personeli aranıyor',
    content: 'Yaz sezonu için resepsiyon ve servis personeli alınacaktır. Detaylar için DM.',
    mediaUrls: [],
    category: 'job',
    regionId: 'trabzon',
    district: 'Akçaabat',
    locationLabel: 'Akçaabat',
    latitude: null,
    longitude: null,
    likeCount: 19,
    commentCount: 5,
    quoteCount: 1,
    saveCount: 67,
    viewCount: 540,
    createdAt: hoursAgo(2),
    isLiked: false,
    isSaved: false,
    isFollowing: false,
    quotedPost: null,
    isDemo: true,
  },
];
