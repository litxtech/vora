import type { NewsVerificationStatus, NewsVerificationVote } from '@/features/news-verification/types';

/** Haber doğrulama rozeti yalnızca haber kategorisindeki içeriklerde gösterilir. */
export function supportsNewsVerification(category: string | null | undefined): boolean {
  return category === 'news';
}

export const NEWS_VERIFICATION_STATUS: Record<
  NewsVerificationStatus,
  {
    label: string;
    shortLabel: string;
    description: string;
    color: string;
    icon: 'shield-checkmark' | 'shield-half' | 'shield-outline' | 'close-circle';
  }
> = {
  verified: {
    label: 'Doğru Haber',
    shortLabel: 'Doğrulandı',
    description: 'Muhabirler ve topluluk tarafından doğrulanmış',
    color: '#43A047',
    icon: 'shield-checkmark',
  },
  misinfo: {
    label: 'Yanlış Bilgi',
    shortLabel: 'Yanlış',
    description: 'Toplumu yanıltma riski taşıyor',
    color: '#E53935',
    icon: 'close-circle',
  },
  reviewing: {
    label: 'İnceleniyor',
    shortLabel: 'İncelemede',
    description: 'Henüz kesin bir sonuç yok',
    color: '#F9A825',
    icon: 'shield-half',
  },
  none: {
    label: 'Doğrulanmadı',
    shortLabel: 'Doğrula',
    description: 'Bu içerik henüz doğrulanmadı',
    color: '#64748B',
    icon: 'shield-outline',
  },
};

export const NEWS_VERIFICATION_VOTES: {
  id: NewsVerificationVote;
  label: string;
  subtitle: string;
  color: string;
  icon: 'checkmark-circle' | 'help-circle' | 'close-circle';
}[] = [
  {
    id: 'correct',
    label: 'Doğru Haber',
    subtitle: 'Doğrulanmış, güvenilir bilgi',
    color: '#43A047',
    icon: 'checkmark-circle',
  },
  {
    id: 'unverified',
    label: 'İnceleniyor',
    subtitle: 'Henüz kesin değil, şüpheli olabilir',
    color: '#F9A825',
    icon: 'help-circle',
  },
  {
    id: 'incorrect',
    label: 'Yanlış Bilgi',
    subtitle: 'Toplumu yanıltıyor veya yanlış',
    color: '#E53935',
    icon: 'close-circle',
  },
];

export const REPORTER_ROLES = ['verified_reporter', 'moderator', 'admin', 'super_admin'] as const;
