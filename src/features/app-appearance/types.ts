import type { ThemeMode } from '@/constants/theme';
import type { CenterId } from '@/features/centers/types';
import type { TrustVacationPromoConfig } from '@/features/trust-promo/types';

export type LobbyAnnouncementTone = 'info' | 'warning' | 'success' | 'accent';

export type LobbyAnnouncement = {
  id: string;
  enabled: boolean;
  title: string;
  message: string;
  tone: LobbyAnnouncementTone;
  dismissible: boolean;
};

export type ThemeColorOverrides = Partial<Record<string, string>>;

export type GradientOverrides = {
  karadeniz?: string[];
  waveAccent?: string;
};

export type LobbyAppearanceConfig = {
  tagline: string;
  welcome_title: string;
  welcome_subtitle: string;
  announcements: LobbyAnnouncement[];
};

export type SpacingOverrides = Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl', number>>;

export type RadiusOverrides = Partial<Record<'sm' | 'md' | 'lg' | 'xl' | 'full', number>>;

export type TypographyVariant = 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';

export type TypographyOverrides = Partial<
  Record<TypographyVariant, Partial<{ fontSize: number; lineHeight: number; fontWeight: string }>>
>;

export type TabBarAppearance = {
  activeTint?: string;
  inactiveTint?: string;
  background?: string;
  border?: string;
};

export type FeedBannerConfig = {
  enabled: boolean;
  title: string;
  message: string;
  tone: LobbyAnnouncementTone;
  dismissible: boolean;
};

export type CentersHubAppearance = {
  title: string;
  subtitle: string;
  accent?: string;
  featured_center_ids: CenterId[];
};

export type BrandingAppearance = {
  /** Lobi ekranında gösterilecek uzak ikon URL (build gerektirmez) */
  lobby_icon_url?: string | null;
  shell_background_dark?: string;
  shell_background_light?: string;
};

export type AppAppearanceConfig = {
  version: number;
  colors: Record<ThemeMode, ThemeColorOverrides>;
  gradients: Record<ThemeMode, GradientOverrides>;
  spacing: SpacingOverrides;
  radius: RadiusOverrides;
  typography: TypographyOverrides;
  tab_bar: Record<ThemeMode, TabBarAppearance>;
  feed: { banner: FeedBannerConfig };
  centers_hub: CentersHubAppearance;
  branding: BrandingAppearance;
  lobby: LobbyAppearanceConfig;
  trust_vacation_promo: TrustVacationPromoConfig;
  admin_note?: string;
};
