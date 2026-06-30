import type { PremiumSupportStatus, PremiumSupportTopic } from '@/features/premium-support/types';

export const PREMIUM_SUPPORT_STATUS_LABELS: Record<PremiumSupportStatus, string> = {
  open: 'Açık',
  waiting_user: 'Yanıtınız bekleniyor',
  waiting_support: 'Destek yanıtlıyor',
  resolved: 'Çözüldü',
  closed: 'Kapatıldı',
};

export const PREMIUM_SUPPORT_TOPICS: {
  id: PremiumSupportTopic;
  label: string;
  prompt: string;
}[] = [
  {
    id: 'purchase',
    label: 'Satın alma sorunu',
    prompt: 'Premium satın alırken sorun yaşıyorum: ',
  },
  {
    id: 'billing',
    label: 'Ödeme / fatura',
    prompt: 'Ödeme veya fatura ile ilgili sorum var: ',
  },
  {
    id: 'renewal',
    label: 'Yenileme tarihi',
    prompt: 'Abonelik yenileme tarihim hakkında: ',
  },
  {
    id: 'cancel',
    label: 'İptal',
    prompt: 'Aboneliğimi iptal etmek istiyorum: ',
  },
  {
    id: 'restore',
    label: 'Geri yükleme',
    prompt: 'Satın aldığım Premium geri yüklenmiyor: ',
  },
  {
    id: 'features',
    label: 'Premium özellikler',
    prompt: 'Premium özellikler açılmıyor: ',
  },
  {
    id: 'other',
    label: 'Diğer',
    prompt: 'Premium aboneliğim hakkında: ',
  },
];

export const MIN_PREMIUM_SUPPORT_MESSAGE_LENGTH = 2;
export const MAX_PREMIUM_SUPPORT_MESSAGE_LENGTH = 2000;

export const PREMIUM_SUPPORT_SESSION_MINUTES = 5;

export const PREMIUM_SUPPORT_SESSION_HINT =
  'Destek ekibi 5 dakika içinde yanıt vermezse sohbet otomatik kapanır. Yanıt geldiğinde telefonunuza bildirim gönderilir.';

export const PREMIUM_SUPPORT_ENTRY_SUBTITLE =
  'Abonelik, ödeme ve yenileme sorularınız için canlı destek · görsel gönderebilirsiniz';
