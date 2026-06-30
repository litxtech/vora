import type { CenterDef } from '@/features/centers/types';

/** false: merkez, rota ve admin moderasyonu gizlenir */
export const TIP_LINE_ENABLED = false;

export const TIP_LINE_DISPLAY_NAME = 'Platform İhbar';

export const TIP_LINE_CENTER_DEF: CenterDef = {
  id: 'tip-line',
  section: 54,
  route: '/tip-line-center',
  title: TIP_LINE_DISPLAY_NAME,
  subtitle: 'Anonim platform ihbarı — göç, asayiş, çevre ve kamu düzeni',
  icon: 'megaphone',
  accent: '#455A64',
  group: 'community',
  hasCreate: true,
};

export const TIP_LINE_ACCENT = '#455A64';
export const TIP_LINE_ACCENT_DEEP = '#263238';
export const TIP_MIN_DESCRIPTION_LENGTH = 20;
export const TIP_MAX_DESCRIPTION_LENGTH = 1200;

export type TipCategory =
  | 'irregular_migration'
  | 'foreign_national_issue'
  | 'public_disorder'
  | 'drug_activity'
  | 'pollution'
  | 'road_issue'
  | 'other';

export type TipCategoryDef = {
  label: string;
  hint: string;
  icon: string;
  color: string;
};

export const TIP_CATEGORY_LIST: { id: TipCategory; label: string; hint: string; icon: string; color: string }[] = [
  {
    id: 'irregular_migration',
    label: 'Düzensiz Göç',
    hint: 'Kayıtsız konaklama, sınır dışı kalma',
    icon: 'walk-outline',
    color: '#5C6BC0',
  },
  {
    id: 'foreign_national_issue',
    label: 'Yabancı Uyruk',
    hint: 'Oturum, çalışma veya düzen ihlali',
    icon: 'globe-outline',
    color: '#00897B',
  },
  {
    id: 'public_disorder',
    label: 'Asayiş',
    hint: 'Kavga, taciz, güvenlik tehdidi',
    icon: 'shield-half-outline',
    color: '#E53935',
  },
  {
    id: 'drug_activity',
    label: 'Uyuşturucu',
    hint: 'Satış, kullanım veya kaçakçılık',
    icon: 'medical-outline',
    color: '#8E24AA',
  },
  {
    id: 'pollution',
    label: 'Çevre Kirliliği',
    hint: 'Atık, hava ve su kirliliği',
    icon: 'leaf-outline',
    color: '#43A047',
  },
  {
    id: 'road_issue',
    label: 'Yol & Altyapı',
    hint: 'Çukur, aydınlatma, trafik düzeni',
    icon: 'construct-outline',
    color: '#FB8C00',
  },
  {
    id: 'other',
    label: 'Diğer',
    hint: 'Listede olmayan konular',
    icon: 'ellipsis-horizontal-outline',
    color: '#78909C',
  },
];

export const TIP_CATEGORIES = Object.fromEntries(
  TIP_CATEGORY_LIST.map((item) => [item.id, item]),
) as Record<TipCategory, TipCategoryDef>;

export const TIP_PROCESS_STEPS = [
  { icon: 'eye-off-outline', label: 'Anonim gönderim' },
  { icon: 'shield-checkmark-outline', label: 'Moderasyon' },
  { icon: 'send-outline', label: 'İlgili birime iletim' },
] as const;

export function tipCategoryLabel(category: string): string {
  return TIP_CATEGORIES[category as TipCategory]?.label ?? category;
}
