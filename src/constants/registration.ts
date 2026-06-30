export type GenderId = 'female' | 'male' | 'other' | 'prefer_not_to_say';

export const GENDER_OPTIONS: { id: GenderId; label: string }[] = [
  { id: 'female', label: 'Kadın' },
  { id: 'male', label: 'Erkek' },
  { id: 'other', label: 'Diğer' },
  { id: 'prefer_not_to_say', label: 'Belirtmek istemiyorum' },
];

export const BUSINESS_CATEGORY_OPTIONS = [
  { id: 'restaurant', label: 'Restoran / Kafe' },
  { id: 'hotel', label: 'Otel / Konaklama' },
  { id: 'retail', label: 'Perakende / Mağaza' },
  { id: 'health', label: 'Sağlık' },
  { id: 'education', label: 'Eğitim' },
  { id: 'construction', label: 'İnşaat / Yapı' },
  { id: 'transport', label: 'Ulaşım / Lojistik' },
  { id: 'tourism', label: 'Turizm' },
  { id: 'technology', label: 'Teknoloji' },
  { id: 'agriculture', label: 'Tarım / Hayvancılık' },
  { id: 'services', label: 'Hizmet' },
  { id: 'other', label: 'Diğer' },
] as const;

export type BusinessCategoryId = (typeof BUSINESS_CATEGORY_OPTIONS)[number]['id'];

export const MAX_BUSINESS_DOCUMENTS = 20;

export const BUSINESS_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];
