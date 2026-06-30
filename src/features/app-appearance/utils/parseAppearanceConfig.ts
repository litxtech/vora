import {
  DEFAULT_APP_APPEARANCE,
  DEFAULT_FEED_BANNER,
} from '@/features/app-appearance/constants';
import { CENTER_BY_ID } from '@/constants/centers';
import type { CenterId } from '@/features/centers/types';
import { DEFAULT_TRUST_VACATION_PROMO } from '@/features/trust-promo/constants';
import type {
  TrustVacationPromoConfig,
  TrustVacationPromoPlacement,
} from '@/features/trust-promo/types';
import type {
  AppAppearanceConfig,
  BrandingAppearance,
  CentersHubAppearance,
  FeedBannerConfig,
  GradientOverrides,
  LobbyAnnouncement,
  LobbyAnnouncementTone,
  RadiusOverrides,
  SpacingOverrides,
  TabBarAppearance,
  ThemeColorOverrides,
  TypographyOverrides,
} from '@/features/app-appearance/types';
import type { ThemeMode } from '@/constants/theme';

const ANNOUNCEMENT_TONES: LobbyAnnouncementTone[] = ['info', 'warning', 'success', 'accent'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseColorOverrides(value: unknown): ThemeColorOverrides {
  if (!isRecord(value)) return {};
  const result: ThemeColorOverrides = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'string' && raw.trim()) {
      result[key] = raw.trim();
    }
  }
  return result;
}

function parseNumericOverrides<T extends string>(
  value: unknown,
  allowed: readonly T[],
): Partial<Record<T, number>> {
  if (!isRecord(value)) return {};
  const result: Partial<Record<T, number>> = {};
  for (const key of allowed) {
    const raw = value[key];
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      result[key] = raw;
    } else if (typeof raw === 'string' && raw.trim()) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) result[key] = parsed;
    }
  }
  return result;
}

function parseGradientOverrides(value: unknown): GradientOverrides {
  if (!isRecord(value)) return {};
  const result: GradientOverrides = {};
  const karadeniz = value.karadeniz;
  if (Array.isArray(karadeniz) && karadeniz.every((c) => typeof c === 'string')) {
    result.karadeniz = karadeniz as string[];
  }
  if (typeof value.waveAccent === 'string' && value.waveAccent.trim()) {
    result.waveAccent = value.waveAccent.trim();
  }
  return result;
}

function parseModeOverrides(value: unknown): Record<ThemeMode, ThemeColorOverrides> {
  if (!isRecord(value)) {
    return { dark: {}, light: {} };
  }
  return {
    dark: parseColorOverrides(value.dark),
    light: parseColorOverrides(value.light),
  };
}

function parseGradientModeOverrides(value: unknown): Record<ThemeMode, GradientOverrides> {
  if (!isRecord(value)) {
    return { dark: {}, light: {} };
  }
  return {
    dark: parseGradientOverrides(value.dark),
    light: parseGradientOverrides(value.light),
  };
}

function parseTabBarMode(value: unknown): Record<ThemeMode, TabBarAppearance> {
  if (!isRecord(value)) return { dark: {}, light: {} };
  const parseOne = (raw: unknown): TabBarAppearance => {
    if (!isRecord(raw)) return {};
    const result: TabBarAppearance = {};
    for (const key of ['activeTint', 'inactiveTint', 'background', 'border'] as const) {
      if (typeof raw[key] === 'string' && raw[key].trim()) {
        result[key] = raw[key].trim();
      }
    }
    return result;
  };
  return { dark: parseOne(value.dark), light: parseOne(value.light) };
}

function parseTypography(value: unknown): TypographyOverrides {
  if (!isRecord(value)) return {};
  const result: TypographyOverrides = {};
  for (const variant of ['h1', 'h2', 'h3', 'body', 'caption', 'label'] as const) {
    const raw = value[variant];
    if (!isRecord(raw)) continue;
    const patch: NonNullable<TypographyOverrides[typeof variant]> = {};
    if (typeof raw.fontSize === 'number' && raw.fontSize > 0) patch.fontSize = raw.fontSize;
    if (typeof raw.lineHeight === 'number' && raw.lineHeight > 0) patch.lineHeight = raw.lineHeight;
    if (typeof raw.fontWeight === 'string' && raw.fontWeight.trim()) {
      patch.fontWeight = raw.fontWeight.trim();
    }
    if (Object.keys(patch).length > 0) result[variant] = patch;
  }
  return result;
}

function parseAnnouncement(value: unknown): LobbyAnnouncement | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  const tone = ANNOUNCEMENT_TONES.includes(value.tone as LobbyAnnouncementTone)
    ? (value.tone as LobbyAnnouncementTone)
    : 'info';

  return {
    id: value.id,
    enabled: value.enabled !== false,
    title: typeof value.title === 'string' ? value.title : '',
    message: typeof value.message === 'string' ? value.message : '',
    tone,
    dismissible: value.dismissible !== false,
  };
}

function parseAnnouncements(value: unknown): LobbyAnnouncement[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseAnnouncement).filter((item): item is LobbyAnnouncement => item !== null);
}

function parseFeedBanner(value: unknown): FeedBannerConfig {
  if (!isRecord(value)) return { ...DEFAULT_FEED_BANNER };
  const tone = ANNOUNCEMENT_TONES.includes(value.tone as LobbyAnnouncementTone)
    ? (value.tone as LobbyAnnouncementTone)
    : DEFAULT_FEED_BANNER.tone;
  return {
    enabled: value.enabled === true,
    title: typeof value.title === 'string' ? value.title : '',
    message: typeof value.message === 'string' ? value.message : '',
    tone,
    dismissible: value.dismissible !== false,
  };
}

function parseFeaturedCenterIds(value: unknown): CenterId[] {
  if (!Array.isArray(value)) return [...DEFAULT_APP_APPEARANCE.centers_hub.featured_center_ids];

  const seen = new Set<string>();
  const ids: CenterId[] = [];

  for (const item of value) {
    if (typeof item !== 'string' || seen.has(item) || !CENTER_BY_ID[item as CenterId]) continue;
    seen.add(item);
    ids.push(item as CenterId);
  }

  return ids;
}

function parseCentersHub(value: unknown): CentersHubAppearance {
  if (!isRecord(value)) return { ...DEFAULT_APP_APPEARANCE.centers_hub };
  return {
    title:
      typeof value.title === 'string' && value.title.trim()
        ? value.title.trim()
        : DEFAULT_APP_APPEARANCE.centers_hub.title,
    subtitle:
      typeof value.subtitle === 'string' && value.subtitle.trim()
        ? value.subtitle.trim()
        : DEFAULT_APP_APPEARANCE.centers_hub.subtitle,
    accent: typeof value.accent === 'string' && value.accent.trim() ? value.accent.trim() : undefined,
    featured_center_ids: parseFeaturedCenterIds(value.featured_center_ids),
  };
}

const PROMO_PLACEMENTS: TrustVacationPromoPlacement[] = ['feed', 'wallet', 'insights', 'lobby'];

function parseTrustVacationPromo(value: unknown): TrustVacationPromoConfig {
  if (!isRecord(value)) return { ...DEFAULT_TRUST_VACATION_PROMO };

  const placementsRaw = isRecord(value.placements) ? value.placements : {};
  const placements = { ...DEFAULT_TRUST_VACATION_PROMO.placements };
  for (const key of PROMO_PLACEMENTS) {
    if (typeof placementsRaw[key] === 'boolean') {
      placements[key] = placementsRaw[key];
    }
  }

  return {
    enabled: value.enabled !== false,
    badge:
      typeof value.badge === 'string' && value.badge.trim()
        ? value.badge.trim()
        : DEFAULT_TRUST_VACATION_PROMO.badge,
    title: typeof value.title === 'string' ? value.title : DEFAULT_TRUST_VACATION_PROMO.title,
    message:
      typeof value.message === 'string' ? value.message : DEFAULT_TRUST_VACATION_PROMO.message,
    highlight:
      typeof value.highlight === 'string'
        ? value.highlight
        : DEFAULT_TRUST_VACATION_PROMO.highlight,
    cta_label:
      typeof value.cta_label === 'string'
        ? value.cta_label
        : DEFAULT_TRUST_VACATION_PROMO.cta_label,
    cta_href:
      typeof value.cta_href === 'string' ? value.cta_href : DEFAULT_TRUST_VACATION_PROMO.cta_href,
    image_url:
      typeof value.image_url === 'string' && value.image_url.trim()
        ? value.image_url.trim()
        : value.image_url === null
          ? null
          : DEFAULT_TRUST_VACATION_PROMO.image_url,
    dismissible: value.dismissible !== false,
    placements,
  };
}

function parseBranding(value: unknown): BrandingAppearance {
  if (!isRecord(value)) return {};
  const result: BrandingAppearance = {};
  if (typeof value.lobby_icon_url === 'string' && value.lobby_icon_url.trim()) {
    result.lobby_icon_url = value.lobby_icon_url.trim();
  } else if (value.lobby_icon_url === null) {
    result.lobby_icon_url = null;
  }
  if (typeof value.shell_background_dark === 'string' && value.shell_background_dark.trim()) {
    result.shell_background_dark = value.shell_background_dark.trim();
  }
  if (typeof value.shell_background_light === 'string' && value.shell_background_light.trim()) {
    result.shell_background_light = value.shell_background_light.trim();
  }
  return result;
}

export function parseAppearanceConfig(raw: unknown): AppAppearanceConfig {
  if (!isRecord(raw)) return { ...DEFAULT_APP_APPEARANCE };

  const lobbyRaw = isRecord(raw.lobby) ? raw.lobby : {};
  const feedRaw = isRecord(raw.feed) ? raw.feed : {};

  return {
    version: typeof raw.version === 'number' ? raw.version : 2,
    colors: parseModeOverrides(raw.colors),
    gradients: parseGradientModeOverrides(raw.gradients),
    spacing: parseNumericOverrides(raw.spacing, ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const),
    radius: parseNumericOverrides(raw.radius, ['sm', 'md', 'lg', 'xl', 'full'] as const),
    typography: parseTypography(raw.typography),
    tab_bar: parseTabBarMode(raw.tab_bar),
    feed: { banner: parseFeedBanner(feedRaw.banner) },
    centers_hub: parseCentersHub(raw.centers_hub),
    branding: parseBranding(raw.branding),
    lobby: {
      tagline:
        typeof lobbyRaw.tagline === 'string' && lobbyRaw.tagline.trim()
          ? lobbyRaw.tagline.trim()
          : DEFAULT_APP_APPEARANCE.lobby.tagline,
      welcome_title:
        typeof lobbyRaw.welcome_title === 'string' && lobbyRaw.welcome_title.trim()
          ? lobbyRaw.welcome_title.trim()
          : DEFAULT_APP_APPEARANCE.lobby.welcome_title,
      welcome_subtitle:
        typeof lobbyRaw.welcome_subtitle === 'string' && lobbyRaw.welcome_subtitle.trim()
          ? lobbyRaw.welcome_subtitle.trim()
          : DEFAULT_APP_APPEARANCE.lobby.welcome_subtitle,
      announcements: parseAnnouncements(lobbyRaw.announcements),
    },
    trust_vacation_promo: parseTrustVacationPromo(raw.trust_vacation_promo),
    admin_note: typeof raw.admin_note === 'string' ? raw.admin_note : undefined,
  };
}
