import type { RegionId } from '@/constants/regions';

export type AdType = 'feed' | 'reels' | 'map' | 'business';
export type AdStatus = 'draft' | 'pending' | 'active' | 'paused' | 'ended';
export type AdCtaLabel = 'learn_more' | 'shop_now' | 'visit' | 'contact' | 'sign_up';
export type AdBillingMode = 'wallet_cpc';
/** general = tüm bölgeler; regional = seçili şehirler */
export type AdAudienceScope = 'general' | 'regional';

export type BusinessAd = {
  id: string;
  businessId: string | null;
  ownerId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  ctaLabel: AdCtaLabel;
  destinationUrl: string | null;
  adType: AdType;
  status: AdStatus;
  billingMode: AdBillingMode;
  budgetCents: number;
  spentCents: number;
  cpcCents: number;
  targetRegionId: string | null;
  targetRegionIds: RegionId[];
  targetDistrict: string | null;
  targetAgeMin: number | null;
  targetAgeMax: number | null;
  targetInterests: string[];
  impressions: number;
  clicks: number;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
};

export type CreateAdInput = {
  title: string;
  description: string;
  imageUrl?: string | null;
  ctaLabel?: AdCtaLabel;
  destinationUrl?: string | null;
  adType: AdType;
  billingMode: AdBillingMode;
  budgetCents: number;
  cpcCents: number;
  targetRegionIds: RegionId[];
  targetDistrict: string | null;
  targetAgeMin: number | null;
  targetAgeMax: number | null;
  targetInterests: string[];
  endsAt: string | null;
};

export type AdWalletSummary = {
  balanceCents: number;
  cpcCents: number;
  minBudgetCents: number;
  minTopupCents: number;
};

export type AdWalletEntryType = 'topup' | 'ad_click' | 'admin_adjustment' | 'refund';

export type AdWalletLedgerEntry = {
  id: string;
  amountCents: number;
  balanceAfterCents: number;
  entryType: AdWalletEntryType;
  adId: string | null;
  adTitle: string | null;
  note: string | null;
  createdAt: string;
};

export type AdStudioDraft = Omit<CreateAdInput, 'billingMode' | 'budgetCents' | 'cpcCents'> & {
  localImageUri: string | null;
  audienceScope: AdAudienceScope;
};

export type RestartAdResult = {
  billingMode: AdBillingMode;
  endsAt: string;
};

/** @deprecated Eski platform borcu kayıtları (admin) */
export type PlatformDebtRow = {
  userId: string;
  username: string;
  fullName: string | null;
  platformDebtCents: number;
  hasCardOnFile: boolean;
  updatedAt: string;
};
