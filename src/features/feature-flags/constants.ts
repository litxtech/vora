import { CENTERS } from '@/constants/centers';
import { FEATURE_SUB_REGISTRY } from '@/features/feature-flags/registry/subFeatures';
import { LIVE_SUPPORT_CENTER_DEF } from '@/features/live-support/constants';
import type { AppFeatureDef, FeatureGroup } from '@/features/feature-flags/types';

export const FEATURE_GROUPS: { id: FeatureGroup; label: string }[] = [
  { id: 'tabs', label: 'Ana Sekmeler' },
  { id: 'auth', label: 'Lobi & Giriş' },
  { id: 'centers', label: 'Merkezler' },
  { id: 'programs', label: 'Programlar' },
  { id: 'social', label: 'Sosyal' },
  { id: 'actions', label: 'Aksiyonlar' },
];

const TAB_FEATURES: AppFeatureDef[] = [
  { id: 'feed', label: 'Akış', group: 'tabs', kind: 'root', routes: ['/(tabs)', '/(tabs)/index'] },
  { id: 'discover', label: 'Keşfet', group: 'tabs', kind: 'root', routes: ['/(tabs)/discover', '/agenda'] },
  { id: 'map', label: 'Harita', group: 'tabs', kind: 'root', routes: ['/(tabs)/map'] },
  { id: 'reels', label: 'Reels', group: 'tabs', kind: 'root', routes: ['/(tabs)/reels', '/reels'] },
  { id: 'messages', label: 'Mesajlar', group: 'tabs', kind: 'root', routes: ['/(tabs)/messages', '/chat'] },
  { id: 'profile', label: 'Profil', group: 'tabs', kind: 'root', routes: ['/(tabs)/profile'] },
];

const FEED_HEADER_FEATURES: AppFeatureDef[] = [
  {
    id: 'feed-header-leaderboard',
    label: 'Akış başlığı · Puan',
    group: 'tabs',
    parentId: 'feed',
    kind: 'control',
    hint: 'Akış başlığındaki kupa / puan (liderlik) butonu',
  },
  {
    id: 'feed-header-incidents',
    label: 'Akış başlığı · Canlı Nabız',
    group: 'tabs',
    parentId: 'feed',
    kind: 'control',
    hint: 'Akış başlığındaki canlı nabız (pulse) butonu',
  },
  {
    id: 'feed-header-map',
    label: 'Akış başlığı · Harita',
    group: 'tabs',
    parentId: 'feed',
    kind: 'control',
    hint: 'Akış başlığındaki harita butonu',
  },
  {
    id: 'feed-header-search',
    label: 'Akış başlığı · Arama',
    group: 'tabs',
    parentId: 'feed',
    kind: 'control',
    hint: 'Akış başlığındaki arama butonu ve arama çubuğu',
  },
];

const CENTER_FEATURES: AppFeatureDef[] = [
  ...CENTERS.map(
    (center): AppFeatureDef => ({
      id: center.id,
      label: center.title,
      group: 'centers',
      kind: 'root',
      routes: [center.route],
    }),
  ),
  {
    id: LIVE_SUPPORT_CENTER_DEF.id,
    label: LIVE_SUPPORT_CENTER_DEF.title,
    group: 'centers',
    kind: 'root',
    routes: [LIVE_SUPPORT_CENTER_DEF.route],
  },
  {
    id: 'centers-hub',
    label: 'Tüm Merkezler',
    group: 'centers',
    kind: 'root',
    routes: ['/centers'],
  },
];

const PROGRAM_FEATURES: AppFeatureDef[] = [
  { id: 'reporter', label: 'Muhabir Programı', group: 'programs', kind: 'root', routes: ['/reporter'] },
  { id: 'tasks', label: 'Günlük Görevler', group: 'programs', kind: 'root', routes: ['/tasks'] },
  { id: 'wallet', label: 'Cüzdan', group: 'programs', kind: 'root', routes: ['/wallet', '/kuru'] },
  { id: 'premium', label: 'Premium Üyelik', group: 'programs', kind: 'root', routes: ['/settings/premium'] },
  { id: 'job-seeker', label: 'İş Arayan Profili', group: 'programs', kind: 'root', routes: ['/settings/job-seeker'] },
  { id: 'settings', label: 'Ayarlar', group: 'programs', kind: 'root', routes: ['/settings'] },
];

const SOCIAL_FEATURES: AppFeatureDef[] = [
  { id: 'communities', label: 'Topluluklar', group: 'social', kind: 'root', routes: ['/communities'] },
  { id: 'channels', label: 'Kanallar', group: 'social', kind: 'root', routes: ['/channels'] },
  { id: 'ads', label: 'Reklam Paneli', group: 'social', kind: 'root', routes: ['/ads', '/ads/studio'] },
  {
    id: 'stories',
    label: 'Hikayeler',
    group: 'social',
    kind: 'root',
    routes: ['/stories', '/stories/publish'],
  },
  {
    id: 'user-sounds',
    label: 'Ses Oluştur',
    group: 'social',
    kind: 'root',
    routes: ['/sounds', '/sounds/create'],
  },
  {
    id: 'proximity-match',
    label: 'Yakınlık Eşleşmesi',
    group: 'social',
    kind: 'root',
    routes: ['/proximity-matches'],
  },
];

const ACTION_FEATURES: AppFeatureDef[] = [
  { id: 'compose', label: 'Gönderi Oluştur', group: 'actions', kind: 'root', routes: ['/compose', '/media-editor', '/capture'] },
  { id: 'vora-studio', label: 'VORA Video Studio', group: 'actions', kind: 'root', routes: ['/vora-studio'] },
  { id: 'calls', label: 'Sesli / Görüntülü Arama', group: 'actions', kind: 'root', routes: ['/call'] },
  { id: 'notifications', label: 'Bildirimler', group: 'actions', kind: 'root', routes: ['/notifications'] },
  { id: 'vcts', label: 'VORA Doğrulama (VCTS)', group: 'actions', kind: 'root', routes: ['/v'] },
  {
    id: 'incident-graph',
    label: 'Canlı Olay Grafiği',
    group: 'actions',
    kind: 'root',
    routes: ['/incidents'],
    hint: 'Aktif olaylar, zaman çizelgesi ve harita hub ekranı',
  },
];

const AUTH_FEATURES: AppFeatureDef[] = [
  { id: 'apple-sign-in', label: 'Apple ile Giriş', group: 'auth', kind: 'root', routes: ['/(welcome)/lobby'] },
  { id: 'auth-login', label: 'Giriş Yap', group: 'auth', kind: 'root', routes: ['/(auth)/login'] },
  { id: 'auth-register', label: 'Kayıt Ol', group: 'auth', kind: 'root', routes: ['/(auth)/register'] },
  { id: 'auth-guest', label: 'Misafir Girişi', group: 'auth', kind: 'root', routes: ['/(welcome)/lobby'] },
  { id: 'auth-forgot-password', label: 'Şifremi Unuttum', group: 'auth', kind: 'root', routes: ['/(auth)/forgot-password'] },
];

/** Tüm uygulama özellikleri — yeni özellik eklerken buraya kayıt ekleyin. */
export const APP_FEATURE_REGISTRY: AppFeatureDef[] = [
  ...TAB_FEATURES,
  ...FEED_HEADER_FEATURES,
  ...AUTH_FEATURES,
  ...CENTER_FEATURES,
  ...PROGRAM_FEATURES,
  ...SOCIAL_FEATURES,
  ...ACTION_FEATURES,
  ...FEATURE_SUB_REGISTRY,
];

export const APP_FEATURE_BY_ID = Object.fromEntries(
  APP_FEATURE_REGISTRY.filter((feature): feature is AppFeatureDef => Boolean(feature?.id)).map(
    (feature) => [feature.id, feature],
  ),
) as Record<string, AppFeatureDef>;

/** Route korumasından muaf yollar (yönetim, onboarding, lobi). */
export const FEATURE_GUARD_EXEMPT_PREFIXES = [
  '/admin',
  '/(onboarding)',
  '/(welcome)',
  '/settings/notifications',
  '/settings/account',
  '/settings/security',
  '/settings/messaging',
  '/profile/edit',
  '/user/',
  '/u/',
  '/detail/',
  '/post-viewers/',
  '/hashtag/',
  '/izdivac-center',
] as const;

export function featuresByGroup(group: FeatureGroup): AppFeatureDef[] {
  return APP_FEATURE_REGISTRY.filter((feature) => feature.group === group && !feature.parentId);
}

export function allFeaturesByGroup(group: FeatureGroup): AppFeatureDef[] {
  return APP_FEATURE_REGISTRY.filter((feature) => feature.group === group);
}

export function resolveFeatureForPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/';

  if (FEATURE_GUARD_EXEMPT_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return null;
  }

  let best: { id: string; length: number } | null = null;

  for (const feature of APP_FEATURE_REGISTRY) {
    for (const route of feature.routes ?? []) {
      const routeNorm = route.replace(/\/$/, '') || '/';
      if (normalized === routeNorm || normalized.startsWith(`${routeNorm}/`)) {
        if (!best || routeNorm.length > best.length) {
          best = { id: feature.id, length: routeNorm.length };
        }
      }
    }
  }

  return best?.id ?? null;
}
