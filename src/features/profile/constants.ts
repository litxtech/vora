import type { BadgeType } from '@/features/profile/types';

export const REPORTER_LEVELS: Record<number, { label: string; emoji: string; description: string }> = {
  1: { label: 'Yeni Muhabir', emoji: '📰', description: 'Onaylı muhabir — doğrulamaya başlayın' },
  2: { label: 'Yerel Muhabir', emoji: '🥉', description: '5+ doğru doğrulama, 55+ güven puanı' },
  3: { label: 'Bölge Muhabiri', emoji: '🥈', description: '15+ doğru doğrulama, 70+ güven puanı' },
  4: { label: 'Karadeniz Muhabiri', emoji: '🥇', description: '35+ doğru doğrulama, 85+ güven puanı' },
  5: { label: 'Altın Muhabir', emoji: '🏆', description: '75+ doğru doğrulama, 92+ güven puanı' },
};

export const BADGE_CONFIG: Record<
  BadgeType,
  { label: string; color: string; icon: string; description: string }
> = {
  verified_account: {
    label: 'Doğrulanmış',
    color: '#1E88E5',
    icon: 'checkmark-circle',
    description: 'Kimlik doğrulanmış hesap',
  },
  reporter: {
    label: 'Muhabir',
    color: '#1E88E5',
    icon: 'mic',
    description: 'Aktif katkı sağlayan muhabir',
  },
  trusted_contributor: {
    label: 'Güvenilir Katkıcı',
    color: '#00BFA5',
    icon: 'shield-checkmark',
    description: 'Yüksek güven puanına sahip',
  },
  business: {
    label: 'İşletme',
    color: '#FF8F00',
    icon: 'storefront',
    description: 'Kurumsal hesap',
  },
  moderator: {
    label: 'Moderatör',
    color: '#7B1FA2',
    icon: 'shield',
    description: 'Topluluk yöneticisi',
  },
  admin: {
    label: 'Admin',
    color: '#D32F2F',
    icon: 'star',
    description: 'Sistem yöneticisi',
  },
  premium: {
    label: 'Premium',
    color: '#FFB300',
    icon: 'diamond',
    description: 'Premium üye',
  },
  platform_supporter: {
    label: 'Platform Destekçisi',
    color: '#10B981',
    icon: 'heart-circle',
    description: 'Vora platformuna gönüllü destek sağlayan üye',
  },
  platform_charm: {
    label: 'Vora İkonu',
    color: '#818CF8',
    icon: 'sparkles',
    description: 'Platform tarafından verilen cinsiyete özel ikon rozeti',
  },
  pioneer: {
    label: 'Öncü',
    color: '#0891B2',
    icon: 'compass',
    description: 'Topluluğu yönlendiren ve platformda gerekli bilgileri paylaşan üye',
  },
};

export const ACHIEVEMENT_CONFIG: Record<string, { label: string; icon: string; description: string }> = {
  first_post: { label: 'İlk Gönderi', icon: 'create', description: 'İlk gönderinizi paylaştınız' },
  first_100_likes: { label: '100 Beğeni', icon: 'heart', description: 'Gönderileriniz 100 beğeni aldı' },
  first_1000_views: { label: '1000 Görüntülenme', icon: 'eye', description: '1000 görüntülenmeye ulaştınız' },
  first_verified_incident: {
    label: 'İlk Doğrulanmış Olay',
    icon: 'checkmark-done',
    description: 'İlk doğrulanmış olayınızı paylaştınız',
  },
  first_job_application: {
    label: 'İlk İş Başvurusu',
    icon: 'briefcase',
    description: 'İlk iş başvurunuzu yaptınız',
  },
  daily_tasks_complete: {
    label: 'Günlük Kahraman',
    icon: 'trophy',
    description: 'Bir günde tüm görevleri tamamladınız',
  },
  first_event_rsvp: {
    label: 'İlk Etkinlik Katılımı',
    icon: 'calendar',
    description: 'İlk etkinliğe katıldınız',
  },
  events_10_rsvp: {
    label: '10 Etkinlik Katılımı',
    icon: 'calendar',
    description: '10 etkinliğe katıldınız',
  },
  first_event_created: {
    label: 'İlk Etkinlik',
    icon: 'megaphone',
    description: 'İlk etkinliğinizi oluşturdunuz',
  },
  event_community_leader: {
    label: 'Topluluk Lideri',
    icon: 'people',
    description: 'Etkinliğinize 50+ kişi katıldı',
  },
};

import type { Ionicons } from '@expo/vector-icons';
import type { ProfileTab } from '@/features/profile/types';

export const PROFILE_TABS: {
  id: ProfileTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  ownOnly?: boolean;
  privateOnly?: boolean;
}[] = [
  { id: 'posts', label: 'Gönderiler', icon: 'grid-outline' },
  { id: 'reels', label: 'Reels', icon: 'play-circle-outline' },
  { id: 'quotes', label: 'Alıntılar', icon: 'repeat-outline' },
  { id: 'media', label: 'Medya', icon: 'images-outline' },
  { id: 'liked', label: 'Beğenilenler', icon: 'heart-outline' },
  { id: 'saved', label: 'Kaydedilenler', icon: 'bookmark-outline', privateOnly: true },
  { id: 'badges', label: 'Rozetler', icon: 'ribbon-outline' },
];

export const TRUST_SCORE_DEFAULT = 50;
export const TRUST_SCORE_MAX = 100;
export const TRUST_NEWS_VERIFICATION_MIN = 70;
export const TRUST_VACATION_TEASER_MIN = 80;
export const TRUST_REWARD_POOL_MIN = 100;

export const FRIEND_INVITE_POINTS = 3;

/** Davet kodu bilgi modalı — tablo satırları */
export const FRIEND_INVITE_RULES_TABLE = [
  { kural: 'Kendi kodun', aciklama: 'Her üyeye benzersiz bir DAVET kodu verilir.' },
  { kural: 'Paylaşım', aciklama: 'Kodunu 1 arkadaşına gönderebilirsin.' },
  { kural: 'Kod girme', aciklama: 'Sen de arkadaşının kodunu yalnızca 1 kez girebilirsin.' },
  { kural: 'Puan', aciklama: `Kod uygulandığında ikiniz de +${FRIEND_INVITE_POINTS} güven puanı kazanırsınız.` },
  { kural: 'Limit', aciklama: 'Her kod yalnızca 1 kez kullanılabilir; kendi kodunu giremezsin.' },
] as const;

/** Güven puanı seviyeleri — sonuç tablosu */
export const TRUST_SCORE_OUTCOMES_TABLE = [
  { seviye: 'Yeni Üye', puan: '0–54', sonuc: 'Platforma yeni katıldın; güvenini oluşturmaya başla.' },
  { seviye: 'Aktif Üye', puan: '55–79', sonuc: 'Toplulukta aktif ve güvenilir bir üye olarak görünürsün.' },
  {
    seviye: 'Güvenilir Lider',
    puan: String(TRUST_VACATION_TEASER_MIN),
    sonuc: 'Tatil fırsatı hakkında bilgilendirilirsin.',
  },
  { seviye: 'Elit Aday', puan: '85–99', sonuc: 'Yüksek güvenilirlik; zirveye çok az kaldı.' },
  {
    seviye: 'Zirve Üye',
    puan: String(TRUST_REWARD_POOL_MIN),
    sonuc: 'Tatil havuzuna alınırsın; uygun üyelere platform tatil hediyesi verir.',
  },
] as const;

export const TRUST_SCORE_PURPOSE_NOTE =
  'Güven puanı, topluluktaki güvenilirliğini ölçer. Faydalı katkılarla artar; onaylı ihlallerle düşer.';

export const TRUST_POINT_VALUES = {
  identityVerified: 8,
  vacationCardUzungol: 4,
  vacationCardRize: 3,
  incidentVerified: 3,
  newsVerifyCorrect: 2,
  commentQuality: 1,
  eventSuccess: 2,
  firstVerifiedContent: 2,
  cleanStreak30d: 2,
  cleanStreak90d: 1,
  friendInvite: FRIEND_INVITE_POINTS,
} as const;

/** Güven puanı düşüş kuralları — yalnızca moderasyon onayından sonra */
export const TRUST_LOSE_RULES = [
  { label: 'Spam (onaylı ihlal)', points: '-3', note: 'Moderasyon onayı gerekir' },
  { label: 'Yanlış bilgi (onaylı ihlal)', points: '-6', note: 'Moderasyon onayı gerekir' },
  { label: 'Taciz / dolandırıcılık (onaylı ihlal)', points: '-8', note: 'Moderasyon onayı gerekir' },
  { label: 'Çocuk güvenliği (onaylı ihlal)', points: '-15', note: 'Moderasyon onayı gerekir' },
  { label: 'Moderasyon uyarısı', points: '-5', note: 'Admin uyarısı verildiğinde' },
] as const;

/** Güven puanı kazanım kuralları — kullanıcıya gösterim */
export const TRUST_EARN_RULES = [
  { label: 'Arkadaş daveti', points: `+${TRUST_POINT_VALUES.friendInvite}`, note: 'Tek seferlik (1 arkadaş)' },
  { label: 'Kimlik doğrulama', points: `+${TRUST_POINT_VALUES.identityVerified}`, note: 'Tek seferlik' },
  { label: 'Uzungöl tatil kartı paylaşımı (onaylı)', points: `+${TRUST_POINT_VALUES.vacationCardUzungol}`, note: 'Tek seferlik' },
  { label: 'Rize tatil kartı paylaşımı (onaylı)', points: `+${TRUST_POINT_VALUES.vacationCardRize}`, note: 'Tek seferlik' },
  { label: 'Doğrulanmış olay bildirimi', points: `+${TRUST_POINT_VALUES.incidentVerified}`, note: 'Ayda en fazla 2' },
  { label: 'Doğru haber doğrulaması', points: `+${TRUST_POINT_VALUES.newsVerifyCorrect}`, note: 'Günde en fazla 1' },
  { label: '15+ beğenili faydalı yorum', points: `+${TRUST_POINT_VALUES.commentQuality}`, note: 'Yorum başına 1 kez' },
  { label: '20+ katılımcılı etkinlik', points: `+${TRUST_POINT_VALUES.eventSuccess}`, note: 'Etkinlik başına 1 kez' },
  { label: 'İlk doğrulanmış içerik', points: `+${TRUST_POINT_VALUES.firstVerifiedContent}`, note: 'Tek seferlik' },
  { label: '30 gün temiz geçmiş', points: `+${TRUST_POINT_VALUES.cleanStreak30d}`, note: 'Şikayet/ceza yok' },
  { label: '90 gün temiz geçmiş', points: `+${TRUST_POINT_VALUES.cleanStreak90d}`, note: 'Şikayet/ceza yok' },
  { label: 'Günlük görevler', points: '+1 ila +2', note: 'Görev başına; set bonusu +2' },
] as const;

export const TRUST_NO_EARN_RULES = [
  'Normal gönderi paylaşımı (görev ödülü hariç)',
  'Beğeni ve takip',
  'Onaylanmamış sosyal medya paylaşımı',
] as const;

export function getTrustScoreColor(score: number): string {
  if (score >= TRUST_REWARD_POOL_MIN) return '#00BFA5';
  if (score >= 85) return '#43A047';
  if (score >= TRUST_VACATION_TEASER_MIN) return '#1E88E5';
  if (score >= 55) return '#FFB300';
  return '#EF5350';
}

export function getTrustScoreTier(score: number): string {
  if (score >= TRUST_REWARD_POOL_MIN) return 'Zirve Üye';
  if (score >= 85) return 'Elit Aday';
  if (score >= TRUST_VACATION_TEASER_MIN) return 'Güvenilir Lider';
  if (score >= 55) return 'Aktif Üye';
  return 'Yeni Üye';
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}
