import type { PhoneTextSegment } from '@/features/richtext';

export type TextSegment = PhoneTextSegment;

export {
  digitsOnly,
  isPhoneCandidate,
  splitTextByPhoneNumbers,
  textContainsPhoneNumber,
  toTelUri,
  toWhatsAppPhone,
} from '@/features/richtext';
