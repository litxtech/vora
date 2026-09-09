import type { GenderId } from '@/constants/registration';

type DateProfileSlice = {
  onboarding_completed?: boolean | null;
  gender?: string | null;
  birth_date?: string | null;
  account_status?: string | null;
} | null | undefined;

export function isDateAdult(birthDate: string | null | undefined): boolean {
  if (!birthDate) return false;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return birth <= cutoff;
}

export function hasDateGender(profile: DateProfileSlice): boolean {
  return profile?.gender === 'female' || profile?.gender === 'male';
}

/** Date erişimi: 18+, profil tamamlanmış, cinsiyet zorunlu. İzdivaç'tan bağımsız. */
export function canAccessDate(profile: DateProfileSlice): boolean {
  if (!profile) return false;
  if (profile.account_status && profile.account_status !== 'active') return false;
  if (profile.onboarding_completed === false) return false;
  if (!hasDateGender(profile)) return false;
  return isDateAdult(profile.birth_date);
}

export function dateAccessBlockReason(profile: DateProfileSlice): string | null {
  if (!profile) return 'Giriş yapmanız gerekiyor.';
  if (profile.account_status && profile.account_status !== 'active') {
    return 'Hesabınız aktif değil.';
  }
  if (profile.onboarding_completed === false) {
    return 'Date için profilinizi tamamlayın.';
  }
  if (!hasDateGender(profile)) {
    return 'Date için profilinizde cinsiyet bilgisi tanımlı olmalıdır.';
  }
  if (!profile.birth_date) {
    return 'Date için doğum tarihinizi profilinize ekleyin.';
  }
  if (!isDateAdult(profile.birth_date)) {
    return 'Date özelliğine yalnızca 18 yaş ve üzeri üyeler erişebilir.';
  }
  return null;
}

export function genderLabelTr(gender: GenderId | string | null | undefined): string {
  switch (gender) {
    case 'female':
      return 'Kadın';
    case 'male':
      return 'Erkek';
    default:
      return '—';
  }
}

export function formatDateSchedule(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function spotsRemaining(seeking: number, approved: number): number {
  return Math.max(0, seeking - approved);
}
