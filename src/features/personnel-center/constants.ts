import type { CenterDef } from '@/features/centers/types';
import type {
  JobApplicationStatus,
  JobType,
  ListingType,
  PersonnelApplicationsView,
  PersonnelHub,
  PersonnelSeekFilter,
  PersonnelTab,
} from '@/features/personnel-center/types';

export const PERSONNEL_CENTER_DEF: CenterDef = {
  id: 'personnel-center',
  section: 17,
  route: '/personnel-center',
  title: 'Personel Merkezi',
  subtitle: 'İş ara · ilan ver · başvuruları yönet',
  icon: 'briefcase',
  accent: '#1E88E5',
  group: 'economy',
  hasCreate: true,
};

export const PERSONNEL_ACCENT = PERSONNEL_CENTER_DEF.accent;
export const PERSONNEL_GRADIENT = ['#1E88E5', '#42A5F5'] as const;
export const JOB_MAX_WORKPLACE_PHOTOS = 6;

export const PERSONNEL_TABS: { id: PersonnelTab; label: string; icon: string }[] = [
  { id: 'live', label: 'Canlı Ağ', icon: 'pulse-outline' },
  { id: 'incoming', label: 'Gelen Başvurular', icon: 'mail-outline' },
  { id: 'hiring', label: 'Personel Arıyorum', icon: 'people-outline' },
  { id: 'seeking', label: 'İş Arıyorum', icon: 'search-outline' },
  { id: 'applications', label: 'Başvurularım', icon: 'document-text-outline' },
  { id: 'urgent', label: 'Acil Personel', icon: 'flash-outline' },
  { id: 'recent', label: 'Son İlanlar', icon: 'time-outline' },
  { id: 'nearby', label: 'Yakınımdaki', icon: 'navigate-outline' },
  { id: 'favorites', label: 'Favoriler', icon: 'heart-outline' },
  { id: 'saved_searches', label: 'Kayıtlı Aramalar', icon: 'bookmark-outline' },
];

export const PERSONNEL_HUBS: {
  id: PersonnelHub;
  label: string;
  hint: string;
  icon: string;
}[] = [
  {
    id: 'seek',
    label: 'İş Ara',
    hint: 'İlanları keşfet, başvur',
    icon: 'search-outline',
  },
  {
    id: 'hire',
    label: 'İlan Ver',
    hint: 'İlan aç, personel bul',
    icon: 'megaphone-outline',
  },
  {
    id: 'applications',
    label: 'Başvurular',
    hint: 'Gelen ve giden işlemler',
    icon: 'documents-outline',
  },
];

export const PERSONNEL_SEEK_FILTERS: {
  id: PersonnelSeekFilter;
  label: string;
  icon: string;
}[] = [
  { id: 'all', label: 'Tümü', icon: 'grid-outline' },
  { id: 'urgent', label: 'Acil', icon: 'flash-outline' },
  { id: 'nearby', label: 'Yakınımda', icon: 'navigate-outline' },
  { id: 'recent', label: 'Son', icon: 'time-outline' },
  { id: 'favorites', label: 'Favoriler', icon: 'heart-outline' },
];

export const PERSONNEL_APPLICATIONS_VIEWS: {
  id: PersonnelApplicationsView;
  label: string;
  icon: string;
}[] = [
  { id: 'incoming', label: 'Gelen', icon: 'mail-outline' },
  { id: 'mine', label: 'Gönderdiğim', icon: 'paper-plane-outline' },
];

export function resolvePersonnelDataTab(
  hub: PersonnelHub,
  seekFilter: PersonnelSeekFilter,
  applicationsView: PersonnelApplicationsView,
): PersonnelTab {
  if (hub === 'hire') return 'hiring';
  if (hub === 'applications') {
    return applicationsView === 'incoming' ? 'incoming' : 'applications';
  }
  switch (seekFilter) {
    case 'urgent':
      return 'urgent';
    case 'nearby':
      return 'nearby';
    case 'recent':
      return 'recent';
    case 'favorites':
      return 'favorites';
    default:
      return 'seeking';
  }
}

export const EMPLOYER_STATUS_ACTIONS: {
  status: JobApplicationStatus;
  label: string;
  variant: 'primary' | 'secondary' | 'outline' | 'danger';
}[] = [
  { status: 'reviewing', label: 'İncele', variant: 'outline' },
  { status: 'interview', label: 'Görüşme', variant: 'secondary' },
  { status: 'accepted', label: 'Kabul Et', variant: 'primary' },
  { status: 'rejected', label: 'Reddet', variant: 'danger' },
];

export const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: 'full_time', label: 'Tam Zamanlı' },
  { value: 'part_time', label: 'Yarı Zamanlı' },
  { value: 'daily', label: 'Günlük' },
  { value: 'weekly', label: 'Haftalık' },
  { value: 'seasonal', label: 'Sezonluk' },
  { value: 'remote', label: 'Uzaktan' },
];

export const SALARY_TYPE_OPTIONS = [
  { value: 'net' as const, label: 'Net Maaş' },
  { value: 'range' as const, label: 'Maaş Aralığı' },
  { value: 'negotiable' as const, label: 'Görüşülecek' },
];

export const SKILL_TAGS = [
  'Resepsiyon',
  'Kat Görevlisi',
  'Aşçı',
  'Garson',
  'Komi',
  'Temizlik',
  'Güvenlik',
  'Muhasebe',
  'Satış',
  'Yazılım',
  'Tasarım',
  'Şoför',
] as const;

export const MILITARY_STATUS_OPTIONS = [
  { value: 'completed' as const, label: 'Yapıldı' },
  { value: 'exempt' as const, label: 'Muaf' },
  { value: 'postponed' as const, label: 'Tecilli' },
  { value: 'not_applicable' as const, label: 'Uygulanmaz' },
];

export const APPLICATION_STATUS_LABELS: Record<JobApplicationStatus, string> = {
  sent: 'Gönderildi',
  reviewing: 'İnceleniyor',
  interview: 'Görüşme',
  accepted: 'Kabul Edildi',
  rejected: 'Reddedildi',
};

export const NEARBY_JOBS_RADIUS_KM = 15;

export const PERSONNEL_TAB_EMPTY_MESSAGES: Partial<Record<PersonnelTab, string>> = {
  live: 'Henüz canlı istatistik yok.',
  seeking: 'Bu sekmede iş ilanı bulunamadı.',
  hiring: 'Henüz personel veya iş arayan profili yok.',
  urgent: 'Acil etiketli ilan bulunamadı.',
  recent: 'Son eklenen ilan bulunamadı.',
  nearby: 'Yakınınızda ilan bulunamadı.',
  applications: 'Henüz başvurunuz yok.',
  incoming: 'Henüz gelen başvuru yok. İlan verdiğinizde başvurular burada listelenir.',
  favorites: 'Favori ilanınız yok.',
  saved_searches: 'Kayıtlı aramanız yok. Arama yaptıktan sonra kaydedebilirsiniz.',
};

export const PERSONNEL_TAB_EMPTY_ICONS: Partial<Record<PersonnelTab, string>> = {
  live: 'pulse-outline',
  seeking: 'search-outline',
  hiring: 'people-outline',
  urgent: 'flash-outline',
  recent: 'time-outline',
  nearby: 'navigate-outline',
  applications: 'document-text-outline',
  incoming: 'mail-outline',
  favorites: 'heart-outline',
  saved_searches: 'bookmark-outline',
};

export function jobTypeLabel(type: JobType | string): string {
  return JOB_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function listingDetailPath(type: ListingType, id: string): string {
  return type === 'job' ? `/detail/jobs/${id}` : `/detail/staff/${id}`;
}

export function employerApplicationPath(id: string): string {
  return `/personnel-center/application/${id}`;
}

export function jobEditPath(id: string): string {
  return `/personnel-center/edit-job/${id}`;
}

export function jobCreatePath(): string {
  return '/personnel-center/create-job';
}

export function staffEditPath(id: string): string {
  return `/personnel-center/edit-staff/${id}`;
}

export function staffCreatePath(): string {
  return '/personnel-center/create-staff';
}
