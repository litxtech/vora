export type IdentityVerificationStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

export type IdentityDocumentType = 'national_id' | 'passport' | 'drivers_license';

export const IDENTITY_DOCUMENT_OPTIONS: { id: IdentityDocumentType; label: string }[] = [
  { id: 'national_id', label: 'T.C. Kimlik Kartı' },
  { id: 'passport', label: 'Pasaport' },
  { id: 'drivers_license', label: 'Ehliyet' },
];

export const IDENTITY_STATUS_LABELS: Record<
  IdentityVerificationStatus,
  { label: string; emoji: string; description: string }
> = {
  pending: {
    label: 'İnceleme Bekliyor',
    emoji: '⏳',
    description: 'Başvurunuz alındı. Ekibimiz en kısa sürede inceleyecek.',
  },
  in_review: {
    label: 'İnceleniyor',
    emoji: '🔍',
    description: 'Başvurunuz şu an inceleniyor.',
  },
  approved: {
    label: 'Onaylandı',
    emoji: '✅',
    description: 'Kimliğiniz doğrulandı. Profilinizde mavi rozet görünür.',
  },
  rejected: {
    label: 'Reddedildi',
    emoji: '❌',
    description: 'Başvurunuz reddedildi. Gerekçeyi okuyup yeniden başvurabilirsiniz.',
  },
};

export const IDENTITY_STORAGE_BUCKET = 'identity-documents';
