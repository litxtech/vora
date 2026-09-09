import { APP_ANDROID_PACKAGE } from '@/constants/app';

/** Play Console — yeni Android kaydı. Askılı Vora X paketi kullanılmaz. */
export const PLAY_ANDROID_PACKAGE = APP_ANDROID_PACKAGE;
export const PLAY_APP_NAME = 'Vora';
export const PLAY_APP_CATEGORY = 'Social';
export const PLAY_APP_TYPE = 'Uygulama';
export const PLAY_CONTAINS_ADS = true;
export const PLAY_HAS_IN_APP_PURCHASES = false;
export const PLAY_TARGET_AGE_ONLY = '18 ve üzeri';

export const PLAY_TAGS = [
  'Sosyal ağ',
  'Topluluk',
  'Haberler',
  'Mesajlaşma',
  'Yerel',
] as const;

export const PLAY_SHORT_DESCRIPTION =
  'Paylaş, mesajlaş, keşfet. Karadeniz’in 18+ sosyal ağı.';

export const PLAY_FULL_DESCRIPTION = `Vora, Karadeniz için 18 yaş ve üzeri sosyal ağdır. Gönderi paylaş, hikâyeleri izle, mesajlaş, çevrendeki insanlarla bağ kur.

Ne yapabilirsin
• Akış, reels ve hikâyelerle paylaş
• Mesaj ve arama
• Harita ve yerel topluluk
• Date ve İzdivaç — yalnızca 18+ üyeler
• İş, etkinlik ve bölgesel keşif

Vora çocuklara veya 18 yaş altına yönelik değildir. Kayıt için 18 yaşını doldurmuş olmak gerekir.

Uygulama içinde işletmelerin onaylı reklamları görünebilir. Google Play üzerinden uygulama içi abonelik satılmaz.

LitxTech tarafından sunulur.`;

export const PLAY_IARC_CATEGORY = 'Social Networking';

/**
 * Play Console → Politika → Uygulama içeriği → İçerik derecelendirmesi
 * Anket dili Play’de değişebilir; anlam aynı kalmalı. 3+ / Everyone görürseniz göndermeyin.
 */
export const PLAY_IARC_ANSWERS: { topic: string; answer: string }[] = [
  { topic: 'Kategori', answer: 'Social Networking (Sosyal ağ)' },
  { topic: 'Kullanıcı içeriği (UGC)', answer: 'Evet — gönderi, reels, yorum, fotoğraf/video' },
  { topic: 'Kullanıcılar birbirine mesaj atabiliyor mu', answer: 'Evet — sohbet ve arama' },
  { topic: 'Konum paylaşımı', answer: 'Evet — isteğe bağlı, izinle' },
  { topic: 'Sınırsız internet / dış bağlantı', answer: 'Evet — profil ve reklam linkleri' },
  { topic: 'Flört / tanışma / romantizm', answer: 'Evet — Date ve İzdivaç (yalnızca 18+)' },
  { topic: 'Reklam var mı', answer: 'Evet — uygulama içi işletme reklamları' },
  { topic: 'Reklam olgunluğu', answer: 'Yetişkin kitle (18+); moderasyonlu işletme tanıtımı. Kumar/porno yok' },
  { topic: 'Cinsel içerik / çıplaklık (uygulama)', answer: 'Hayır — yasak. Date yetişkin sosyal alandır, pornografi yoktur' },
  { topic: 'Şiddet (uygulama içeriği)', answer: 'Hayır — yasak. UGC riski var, moderasyon ve şikayet var' },
  { topic: 'Kumar', answer: 'Hayır' },
  { topic: 'Alkol / tütün (uygulama özelliği)', answer: 'Hayır — uygulama satmaz. UGC’de geçebilir, politika yasaklar' },
  { topic: 'Uygulama içi satın alma', answer: 'Hayır (Play I’da IAP kapalı)' },
  { topic: 'Kaba dil', answer: 'Kullanıcılar yazabilir; topluluk kuralları ve şikayet var' },
];

export const PLAY_DATA_SAFETY_NOTES = [
  'Toplanır: e-posta, ad, kullanıcı adı, doğum tarihi, cinsiyet, kullanıcı kimliği, fotoğraflar, mesajlar, isteğe bağlı konum',
  'Amaç: hesap, sosyal özellikler, Date/İzdivaç, reklam gösterimi, güvenlik',
  'Satılmaz. Üçüncü taraf reklam ağı yok',
  'Aktarımda şifreleme: evet (HTTPS)',
  'Kullanıcı silebilir: evet (hesap silme + support@litxtech.com)',
  'Çocuklara yönelik değil; 18+ ',
] as const;
