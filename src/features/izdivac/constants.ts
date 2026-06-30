import type { CenterDef } from '@/features/centers/types';
import type { IzdivacMainTab, IzdivacSpecialBadgeType } from '@/features/izdivac/types';
import type { Ionicons } from '@expo/vector-icons';

export type IzdivacSpecialBadgeDef = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient: readonly [string, string];
  /** Tıklanınca açılan açıklama notu */
  note: string;
};

export const IZDIVAC_SPECIAL_BADGES: Record<IzdivacSpecialBadgeType, IzdivacSpecialBadgeDef> = {
  jigolo: {
    label: 'Jigolo',
    icon: 'flame',
    color: '#FF3B6B',
    gradient: ['#FF3B6B', '#FF8AA8'],
    note: 'Yönetim tarafından verilen özel bir İzdivaç tikidir. Yalnızca platform yönetimi tarafından tanımlanır.',
  },
  tilki: {
    label: 'Tilki',
    icon: 'paw',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#FBBF24'],
    note: 'Kurnaz ve girişken üyelere yönetim tarafından verilen özel İzdivaç tikidir.',
  },
  finansman: {
    label: 'Finansman',
    icon: 'diamond',
    color: '#10B981',
    gradient: ['#0EA5A0', '#34D399'],
    note: 'Finansman, uygulamayı finanse eden kişilere verilir. Bu tik, platforma maddi destek sağlayan değerli üyeleri temsil eder.',
  },
};

export const IZDIVAC_SPECIAL_BADGE_ORDER: IzdivacSpecialBadgeType[] = ['finansman', 'jigolo', 'tilki'];

export const IZDIVAC_CENTER_DEF: CenterDef = {
  id: 'izdivac-center',
  section: 60,
  route: '/izdivac-center',
  title: 'İzdivaç',
  subtitle: 'Güvenli tanışma ve arkadaşlık alanı',
  icon: 'heart-half',
  accent: '#E91E63',
  group: 'social',
};

export const IZDIVAC_ACCENT = '#E91E63';

export const IZDIVAC_GRADIENT = ['#E91E63', '#F48FB1'] as const;

export const IZDIVAC_LOBBY_HEARTBEAT_MS = 60_000;

export const IZDIVAC_LOBBY_POLL_MS = 15_000;

export const IZDIVAC_WALL_MAX_MEDIA = 4;

export const IZDIVAC_WALL_VIDEO_MAX_DURATION_SEC = 120;

export const IZDIVAC_WALL_VIDEO_MAX_UPLOAD_BYTES = 48 * 1024 * 1024;

export const IZDIVAC_MAIN_TABS: {
  id: IzdivacMainTab;
  label: string;
  icon: string;
}[] = [
  { id: 'wall', label: 'Duvar', icon: 'newspaper-outline' },
  { id: 'members', label: 'Üyeler', icon: 'people-outline' },
  { id: 'spaces', label: 'Alanlar', icon: 'chatbubbles-outline' },
  { id: 'messages', label: 'Mesajlar', icon: 'chatbubble-ellipses-outline' },
];

export const IZDIVAC_GENDER_TAB_OPTIONS = [
  { id: 'women' as const, label: 'Kadınlar', icon: 'woman-outline', accent: '#E91E63' },
  { id: 'men' as const, label: 'Erkekler', icon: 'man-outline', accent: '#1565C0' },
];

/** @deprecated Use IZDIVAC_GENDER_TAB_OPTIONS */
export const IZDIVAC_TAB_OPTIONS = IZDIVAC_GENDER_TAB_OPTIONS;

export const IZDIVAC_INVITE_TEMPLATES = [
  'Bugün benimle kahve içmek isteyen var mı?',
  'Akşam sohbet etmek isteyen?',
  'Yürüyüş yapmak isteyen var mı?',
  'Çay içip tanışmak isteyen?',
  'Görüntülü sohbet etmek isteyen?',
] as const;

export const IZDIVAC_SPACE_TYPE_LABELS: Record<string, string> = {
  open: 'Açık alan',
  invite_only: 'Davetli',
  plan: 'Plan odası',
};

export function parseIzdivacMainTab(value: string | null | undefined): IzdivacMainTab {
  if (value === 'members' || value === 'spaces' || value === 'messages') {
    return value;
  }
  return 'wall';
}
