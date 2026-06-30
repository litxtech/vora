import type { CenterDef } from '@/features/centers/types';
import type { LiveSupportStatus, LiveSupportTopic } from '@/features/live-support/types';

export const LIVE_SUPPORT_CENTER_DEF: CenterDef = {
  id: 'support-center',
  section: 52,
  route: '/support-center',
  title: 'Canlı Destek Merkezi',
  subtitle: 'Sorunlarınızı anında yazın, destek ekibi canlı yanıtlasın',
  icon: 'headset',
  accent: '#1E88E5',
  group: 'community',
  hasCreate: true,
};

export const LIVE_SUPPORT_ACCENT = LIVE_SUPPORT_CENTER_DEF.accent;

export const LIVE_SUPPORT_STATUS_LABELS: Record<LiveSupportStatus, string> = {
  open: 'Açık',
  waiting_user: 'Yanıtınız bekleniyor',
  waiting_support: 'Destek yanıtlıyor',
  resolved: 'Çözüldü',
  closed: 'Kapatıldı',
  no_response: 'Yanıt alınamadı',
};

export const LIVE_SUPPORT_VIDEO_MAX_DURATION_SEC = 30;
export const LIVE_SUPPORT_VIDEO_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const LIVE_SUPPORT_TOPICS: {
  id: LiveSupportTopic;
  label: string;
  prompt: string;
}[] = [
  { id: 'account', label: 'Hesap', prompt: 'Hesabımla ilgili sorunum: ' },
  { id: 'billing', label: 'Ödeme / Bakiye', prompt: 'Ödeme veya bakiye sorunum: ' },
  { id: 'technical', label: 'Teknik', prompt: 'Teknik bir sorun yaşıyorum: ' },
  { id: 'app_bug', label: 'Uygulama hatası', prompt: 'Uygulamada şu hatayı görüyorum: ' },
  { id: 'report', label: 'Şikayet / İhlal', prompt: 'Şikayet etmek istediğim konu: ' },
  { id: 'general', label: 'Genel', prompt: 'Yardıma ihtiyacım var: ' },
  { id: 'other', label: 'Diğer', prompt: 'Destek konusu: ' },
];

export const MIN_LIVE_SUPPORT_MESSAGE_LENGTH = 2;
export const MAX_LIVE_SUPPORT_MESSAGE_LENGTH = 2000;

export const LIVE_SUPPORT_SESSION_HINT =
  'Destek ekibi 5 dakika içinde yanıt vermezse sohbet otomatik kapanır. Yanıt geldiğinde bildirim alırsınız.';

export const LIVE_SUPPORT_ENTRY_SUBTITLE =
  'Hesap, ödeme, teknik sorunlar ve tüm talepleriniz için canlı destek · görsel gönderebilirsiniz';
