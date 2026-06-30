import type { MisinfoFlagType, WarningLevel } from '@/features/moderation/types';
import type { ReportReason } from '@/types/database';

export const REPORT_RESPONSE_NOTE = '24 saat içinde dönüş yapılacaktır.';

export const REPORT_REASONS: { id: ReportReason; label: string; urgent?: boolean }[] = [
  { id: 'spam', label: 'Spam' },
  { id: 'fake_account', label: 'Sahte Hesap' },
  { id: 'fraud', label: 'Dolandırıcılık' },
  { id: 'abuse', label: 'Taciz' },
  { id: 'threat', label: 'Tehdit' },
  { id: 'harassment', label: 'Hakaret' },
  { id: 'hate_speech', label: 'Nefret Söylemi' },
  { id: 'violence', label: 'Şiddet İçeriği' },
  { id: 'inappropriate', label: 'Uygunsuz İçerik' },
  { id: 'child_safety', label: 'Çocuk Güvenliği', urgent: true },
  { id: 'personal_data', label: 'Kişisel Veri İhlali' },
  { id: 'misinformation', label: 'Sahte Haber' },
];

export const REPORTABLE_TARGET_TYPES = [
  'post',
  'reel',
  'comment',
  'message',
  'profile',
  'business',
  'job_listing',
  'staff_request',
  'event',
  'lost_item',
] as const;

export const MISINFO_FLAG_TYPES: { id: MisinfoFlagType; label: string }[] = [
  { id: 'wrong_info', label: 'Yanlış Bilgi' },
  { id: 'incomplete_info', label: 'Eksik Bilgi' },
  { id: 'outdated', label: 'Eski İçerik' },
  { id: 'wrong_location', label: 'Yanlış Konum' },
];

export const WARNING_LEVEL_LABELS: Record<WarningLevel, string> = {
  warning: 'Uyarı',
  temp_restriction: 'Geçici Kısıtlama',
  temp_suspension: 'Geçici Uzaklaştırma',
  permanent_ban: 'Kalıcı Uzaklaştırma',
};

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  frozen: 'Dondurulmuş',
  deletion_pending: 'Silme Bekliyor',
  deleted: 'Silinmiş',
};
