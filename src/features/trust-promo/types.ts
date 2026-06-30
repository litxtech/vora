export type TrustVacationPromoPlacement = 'feed' | 'wallet' | 'insights' | 'lobby';

export type TrustVacationPromoPlacements = Record<TrustVacationPromoPlacement, boolean>;

export type TrustVacationPromoConfig = {
  enabled: boolean;
  badge: string;
  title: string;
  message: string;
  highlight: string;
  cta_label: string;
  cta_href: string;
  image_url?: string | null;
  dismissible: boolean;
  placements: TrustVacationPromoPlacements;
};
