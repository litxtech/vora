import type { Ionicons } from '@expo/vector-icons';
import { SPECIES_OPTIONS, TREATMENT_LABELS, RESCUE_STATUS_LABELS } from '@/features/vora-canlar/constants';

type IconName = keyof typeof Ionicons.glyphMap;

const OPEN_URGENT = new Set([
  'new_report',
  'awaiting_review',
  'verifying',
  'rescue_planned',
  'team_dispatched',
  'rescued',
  'vet_assessment',
  'treatment',
  'recovery',
]);

export function caseTitle(row: { name?: string | null; public_code?: string | null }) {
  const name = row.name?.trim();
  if (name) return name;
  if (row.public_code) return `Vaka ${row.public_code}`;
  return 'İsimsiz kayıt';
}

export function speciesLabel(id?: string | null) {
  return SPECIES_OPTIONS.find((item) => item.id === id)?.label ?? null;
}

export type ListingOutcome = 'treating' | 'recovered' | 'lost';

export function listingOutcomeMeta(outcome: ListingOutcome): { label: string; tone: string; icon: IconName } {
  if (outcome === 'treating') return { label: 'Tedavi oldu', tone: '#E07A2F', icon: 'medkit' };
  if (outcome === 'recovered') return { label: 'İyileşti', tone: '#2F6B4F', icon: 'happy' };
  return { label: 'Maalesef öldü', tone: '#8D6E63', icon: 'heart-dislike' };
}

export type StatusBadge = {
  label: string;
  tone: string;
  icon: IconName;
  memorial: boolean;
};

/** Kayıtlı durum ve aciliyet. Yüzdeye çevrilmez. */
export function rescueBadge(input: {
  status?: string | null;
  treatment?: string | null;
  urgency?: string | null;
}): StatusBadge {
  const status = input.status ?? '';
  const treatment = input.treatment ?? '';

  if (status === 'lost' || treatment === 'lost') {
    return { label: 'Hayvan kaybedildi', tone: '#8D7B6A', icon: 'flower-outline', memorial: true };
  }
  if (status === 'cancelled') {
    return { label: RESCUE_STATUS_LABELS.cancelled, tone: '#6B7280', icon: 'close-circle-outline', memorial: false };
  }
  if (status === 'completed' || treatment === 'completed') {
    return { label: status === 'completed' ? 'Başarıyla sonuçlandı' : 'Tedavi tamamlandı', tone: '#2F6B4F', icon: 'checkmark-circle', memorial: false };
  }
  if (status === 'rehomed') {
    return { label: 'Güvenli yuvaya yerleştirildi', tone: '#2F6B4F', icon: 'home', memorial: false };
  }
  if (status === 'recovery' || treatment === 'recovery') {
    return { label: 'İyileşme sürecinde', tone: '#2F6B4F', icon: 'leaf', memorial: false };
  }
  if (status === 'treatment' || treatment === 'ongoing') {
    return { label: 'Tedavi sürüyor', tone: '#C47B2B', icon: 'medkit', memorial: false };
  }
  if (treatment === 'assessment' || status === 'vet_assessment') {
    return { label: 'Veteriner değerlendirmesinde', tone: '#C47B2B', icon: 'medkit-outline', memorial: false };
  }
  if ((input.urgency === 'critical' || input.urgency === 'urgent') && (OPEN_URGENT.has(status) || !status)) {
    return {
      label: input.urgency === 'critical' ? 'Acil müdahale gerekiyor' : 'Acil yardım bekliyor',
      tone: '#E07A2F',
      icon: 'alert-circle',
      memorial: false,
    };
  }
  if (status === 'rescued') {
    return { label: 'Kurtarıldı', tone: '#2F6B4F', icon: 'paw', memorial: false };
  }
  const label = RESCUE_STATUS_LABELS[status] ?? TREATMENT_LABELS[treatment] ?? 'Kayıt';
  return { label, tone: '#3D6B58', icon: 'paw', memorial: false };
}

/** Hedef ve gerçekleşen bağıştan. Veri yoksa çubuk yoktur. */
export function campaignProgress(raised: number | null | undefined, target: number | null | undefined) {
  if (raised == null || target == null || target <= 0 || Number.isNaN(raised) || Number.isNaN(target)) return null;
  const ratio = Math.max(0, Math.min(1, raised / target));
  return { ratio, percent: Math.round(ratio * 100), remaining: Math.max(0, target - raised) };
}
