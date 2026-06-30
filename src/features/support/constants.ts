import type { SupportTicketCategory, SupportTicketStatus } from '@/features/support/types';

export const SUPPORT_TICKET_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  account: 'Hesap',
  billing: 'Ödeme / Bakiye',
  technical: 'Teknik',
  general: 'Genel',
};

export const SUPPORT_TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'Açık',
  in_progress: 'İşlemde',
  waiting_user: 'Yanıtınız bekleniyor',
  resolved: 'Çözüldü',
  closed: 'Kapatıldı',
};

export const SUPPORT_CATEGORIES: { id: SupportTicketCategory; label: string }[] = [
  { id: 'account', label: 'Hesap' },
  { id: 'billing', label: 'Ödeme / Bakiye' },
  { id: 'technical', label: 'Teknik' },
  { id: 'general', label: 'Genel' },
];

export const MIN_SUPPORT_SUBJECT_LENGTH = 3;
export const MIN_SUPPORT_CATEGORY_LENGTH = 2;
export const MAX_SUPPORT_CATEGORY_LENGTH = 80;
export const MIN_SUPPORT_MESSAGE_LENGTH = 10;

export function formatSupportTicketCategory(category: string): string {
  if (category in SUPPORT_TICKET_CATEGORY_LABELS) {
    return SUPPORT_TICKET_CATEGORY_LABELS[category as SupportTicketCategory];
  }
  return category;
}

export const SUPPORT_TICKET_SHORTCUTS = [
  {
    id: 'ride_refund',
    label: 'Yolculuk iptal / iade bildirimi',
    hint: 'Rezervasyon iptali, ödeme iadesi veya şoför şikayeti',
    href: '/rides-center/refund-request',
    icon: 'car-outline' as const,
  },
] as const;
