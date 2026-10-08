import type { SearchIntent, SeoEntityType } from '@/features/seo/types';

/** Tek kaynak: sitemap önceliği, robots ve facet kararları buradan okunur. */
export const SEO_LIMITS = {
  postMinChars: 80,
  profileMinBioChars: 40,
  topicMinPosts: 8,
  topicMinAuthors: 3,
  cityPostsIntentMin: 3,
  cityPeopleMin: 3,
  cityEventsIntentMin: 1,
  qualityIndexThreshold: 55,
  sitemapChunk: 1000,
  catalogPosts: 400,
  catalogEvents: 200,
  catalogProfiles: 200,
  catalogGuides: 100,
  titleMax: 60,
  descriptionMax: 158,
  explorePageSize: 12,
  anchorRepeatMax: 4,
} as const;

export const PRIVATE_PATH_PREFIXES = [
  '/admin',
  '/login',
  '/register',
  '/messages',
  '/settings',
  '/wallet',
  '/api/internal',
  '/internal',
  '/chat',
  '/(auth)',
  '/(tabs)',
] as const;

export const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'mc_cid',
  'mc_eid',
  'ref',
  'igshid',
] as const;

/** Filtre parametreleri indexlenmez. page yalnızca sayfalama içindir. */
export const FACET_SEO = {
  noindex: ['q', 'sort', 'gender', 'online', 'filter'],
  block: ['gender', 'online'],
  strip: TRACKING_PARAMS,
  pagination: 'page',
} as const;

export const SITEMAP_PRIORITY: Record<SeoEntityType, number> = {
  home: 1,
  city: 0.8,
  blog: 0.8,
  static: 0.6,
  event: 0.7,
  city_intent: 0.6,
  profile: 0.5,
  post: 0.5,
  topic: 0.4,
};

export const SITEMAP_CHANGE_FREQ: Record<SeoEntityType, 'weekly' | 'monthly'> = {
  home: 'weekly',
  city: 'weekly',
  blog: 'monthly',
  static: 'monthly',
  event: 'weekly',
  city_intent: 'weekly',
  profile: 'monthly',
  post: 'monthly',
  topic: 'weekly',
};

export const GUIDE_INTENT: Record<string, SearchIntent> = {
  features: 'informational',
  policy: 'informational',
  wallet: 'how_to',
  points: 'guide',
  general: 'guide',
};

export const STATIC_PAGES: {
  path: string;
  id: string;
  h1: string;
  title: string;
  description: string;
  paragraphs: string[];
}[] = [
  {
    path: '/ozellikler',
    id: 'features',
    h1: 'Vora ile neler yapabilirsin',
    title: 'Vora özellikleri',
    description:
      'Vora, Karadeniz şehirlerindeki insanların public paylaşımlarını, etkinliklerini ve topluluklarını bir araya getiren sosyal uygulamadır.',
    paragraphs: [
      'Vora bir Karadeniz sosyal uygulamasıdır. İnsanlar şehirlerine göre buluşur, public gönderi paylaşır ve herkese açık etkinlikleri takip eder.',
      'Uygulamada akış, şehir odaları, etkinlikler ve public profiller vardır. Özel mesajlar, cüzdan ve hesap ayarları web aramasına kapalıdır.',
      'Bu sayfa yalnızca herkese açık ürün yüzeyini anlatır. Kayıt ve mesajlaşma uygulama içindedir.',
    ],
  },
  {
    path: '/hakkinda',
    id: 'about',
    h1: 'Vora hakkında',
    title: 'Vora hakkında',
    description:
      'Vora, Karadeniz’de yaşayan ve Karadeniz’le bağı olan insanlar için kurulmuş bir sosyal uygulamadır. Web sitesi public içerikleri gösterir.',
    paragraphs: [
      'Vora, Karadeniz şehirlerindeki toplulukların birbirini bulması için geliştirildi. Trabzon, Rize, Giresun, Ordu, Samsun ve Artvin uygulamanın ilk bölgeleri arasındadır.',
      'Web sitesi, uygulamada herkese açık ve kalite eşiğini geçen içerikleri arama motorlarının okuyabileceği biçimde sunar. Gizli profiller ve özel mesajlar burada yer almaz.',
      'Vora 18 yaş ve üzeri kullanıcılar içindir.',
    ],
  },
  {
    path: '/yardim',
    id: 'help',
    h1: 'Yardım',
    title: 'Vora yardım',
    description: 'Vora hesabın, gizlilik tercihin ve uygulama içi destek için yardım sayfası.',
    paragraphs: [
      'Profilinin arama motorlarında görünüp görünmeyeceğini uygulama içindeki gizlilik bölümünden seçebilirsin. Bu tercih kapalıyken public profil sayfası dizine eklenmez.',
      'Destek talepleri hesap sahibine özeldir ve bu sitede listelenmez. Uygulamadaki destek bölümünden yazabilirsin.',
    ],
  },
  {
    path: '/gizlilik',
    id: 'privacy',
    h1: 'Gizlilik ve dizine ekleme',
    title: 'Gizlilik',
    description:
      'Vora web sitesi yalnızca herkese açık içerikleri gösterir. Özel mesajlar, cüzdan, ayarlar ve kapalı profiller dizine eklenmez.',
    paragraphs: [
      'Arama motorları bu sitede yalnızca public ve kalite kontrolünden geçen sayfaları görebilir. Profilini arama motorlarında göstermek isteğe bağlıdır ve varsayılanı kapalıdır.',
      'E-posta, telefon, adres, özel mesaj, moderasyon notu ve yönetici alanları public HTML içinde yer almaz.',
    ],
  },
  {
    path: '/kosullar',
    id: 'terms',
    h1: 'Kullanım koşulları',
    title: 'Kullanım koşulları',
    description: 'Vora web sitesindeki public sayfaların kullanım çerçevesi. Ayrıntılı metin uygulamada ve yasal bağlantıda durur.',
    paragraphs: [
      'Bu site, Vora uygulamasındaki herkese açık içeriklerin okunabilir kopyasıdır. İçeriklerin sahibi ilgili yazarlardır.',
      'Yasal metnin tamamı, tanımlıysa resmi koşullar bağlantısında ve uygulama içindeki yasal ekranda yayınlanır.',
    ],
  },
  {
    path: '/indir',
    id: 'download',
    h1: 'Vora’yı indir',
    title: 'Vora’yı indir',
    description: 'Vora mobil uygulamasını App Store veya Google Play üzerinden indirebilirsin.',
    paragraphs: [
      'Vora’nın asıl deneyimi mobil uygulamadadır. Web sitesi public içerikleri gösterir ve uygulamayı indirmen için mağaza bağlantısı sunar.',
      'Mağaza bağlantısı yalnızca gerçekten tanımlıysa gösterilir.',
    ],
  },
];
