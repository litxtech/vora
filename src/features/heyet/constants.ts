import type { HeyetSubjectType, HeyetStatus } from './types';

export const HEYET_ACCENT = '#7C3AED';

export const HEYET_SUBJECT_LABELS: Record<HeyetSubjectType, string> = {
  ride_reservation: 'Yolculuk',
  marketplace_order: 'Pazar',
  hotel_reservation: 'Otel',
  vora_service_request: 'Hizmet',
  general: 'Genel',
};

export const HEYET_STATUS_LABELS: Record<HeyetStatus, string> = {
  open: 'Açık',
  closed: 'Kapalı',
};

export const MIN_HEYET_DECISION_LENGTH = 10;
