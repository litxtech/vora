import { TRUST_NEWS_VERIFICATION_MIN, TRUST_POINT_VALUES } from '@/features/profile/constants';
import type { Ionicons } from '@expo/vector-icons';

export const REPORTER_GRADIENT = ['#0F3460', '#1565C0', '#1E88E5'] as const;
export const REPORTER_GRADIENT_DEEP = '#0A1628';

export const REPORTER_SCREEN_SUBTITLE =
  'Yerel haberleri doğrula, topluluğa güvenilir kaynak ol.';

export const REPORTER_VERIFY_CORRECT_POINTS = TRUST_POINT_VALUES.newsVerifyCorrect;
export const REPORTER_VERIFY_INCORRECT_POINTS = 4;

export type ReporterLevelDef = {
  level: number;
  label: string;
  emoji: string;
  description: string;
  minCorrect: number;
  minTrust: number;
};

/** Backend compute_reporter_level ile aynı eşikler */
export const REPORTER_LEVEL_DEFS: ReporterLevelDef[] = [
  {
    level: 1,
    label: 'Yeni Muhabir',
    emoji: '📰',
    description: 'Onaylı muhabir — doğrulamaya başlayın',
    minCorrect: 0,
    minTrust: 0,
  },
  {
    level: 2,
    label: 'Yerel Muhabir',
    emoji: '🥉',
    description: 'Bölgenizde güvenilir doğrulamalar',
    minCorrect: 5,
    minTrust: 55,
  },
  {
    level: 3,
    label: 'Bölge Muhabiri',
    emoji: '🥈',
    description: 'Bölgesel haberlerde referans kaynak',
    minCorrect: 15,
    minTrust: 70,
  },
  {
    level: 4,
    label: 'Karadeniz Muhabiri',
    emoji: '🥇',
    description: 'Karadeniz genelinde tanınan muhabir',
    minCorrect: 35,
    minTrust: 85,
  },
  {
    level: 5,
    label: 'Altın Muhabir',
    emoji: '🏆',
    description: 'En üst seviye muhabir rozeti',
    minCorrect: 75,
    minTrust: 92,
  },
];

export const REPORTER_LEVEL_MAP = Object.fromEntries(
  REPORTER_LEVEL_DEFS.map((def) => [def.level, def]),
) as Record<number, ReporterLevelDef>;

export function computeReporterLevel(
  correctCount: number,
  trustScore: number,
  isReporter: boolean,
): number {
  if (!isReporter) return 1;

  let level = 1;
  for (const def of REPORTER_LEVEL_DEFS) {
    if (correctCount >= def.minCorrect && trustScore >= def.minTrust) {
      level = def.level;
    }
  }
  return level;
}

export function getNextReporterLevelDef(currentLevel: number): ReporterLevelDef | null {
  if (currentLevel >= 5) return null;
  return REPORTER_LEVEL_DEFS.find((def) => def.level === currentLevel + 1) ?? null;
}

export function reporterLevelProgressPct(current: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.round((current / target) * 100));
}

export const REPORTER_BENEFITS: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}[] = [
  {
    icon: 'checkmark-done-outline',
    title: 'Haber doğrula',
    description: `Doğru doğrulama +${REPORTER_VERIFY_CORRECT_POINTS} güven puanı (günde en fazla 1).`,
  },
  {
    icon: 'ribbon-outline',
    title: 'Seviye ilerlemesi',
    description: 'Doğru doğrulama sayısı ve güven puanınızla 5 seviyeye yükselin.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Güvenilirlik',
    description: `Yanlış doğrulama −${REPORTER_VERIFY_INCORRECT_POINTS} puan. Dikkatli ve kaynaklı çalışın.`,
  },
  {
    icon: 'newspaper-outline',
    title: 'Bölgesel görünürlük',
    description: 'İlinizdeki haber akışında doğrulanmış içerik üreticisi olarak öne çıkın.',
  },
];

export const REPORTER_REQUIREMENTS = [
  `Güven puanı ${TRUST_NEWS_VERIFICATION_MIN}+ veya onaylı muhabir başvurusu`,
  'Tarafsız ve kaynak gösteren doğrulama notları',
  'Yanıltıcı / doğrulanamayan içerikte «doğru» dememek',
] as const;
