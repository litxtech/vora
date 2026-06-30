export type BusinessCommissionKind = 'product' | 'hotel';

export type BusinessCommissionContext = {
  registrationApprovedAt: string | null;
  ownerIsPremium: boolean;
};

/** İşletme mağazası — ürün (sabit taban) */
export const BUSINESS_PRODUCT_COMMISSION_RATE = 0.15;

/** İşletme mağazası — otel (sabit taban) */
export const BUSINESS_HOTEL_COMMISSION_RATE = 0.12;

/** İlk 3 ay büyüme teşviki */
export const BUSINESS_GROWTH_COMMISSION_RATE = 0.1;

export const BUSINESS_GROWTH_PERIOD_DAYS = 90;

/** Premium işletme: −2 puan */
export const BUSINESS_PREMIUM_RATE_DISCOUNT = 0.02;

/** Çok ucuz ürünlerde Stripe maliyetini karşılamak için min. komisyon (₺5 / ₺10) */
export const BUSINESS_MIN_COMMISSION_CENTS = 500;
export const BUSINESS_MIN_COMMISSION_HIGH_CENTS = 1000;
export const BUSINESS_MIN_COMMISSION_HIGH_THRESHOLD_CENTS = 3000;

const MS_PER_DAY = 86_400_000;

export function isBusinessGrowthPeriod(registrationApprovedAt: string | null, now = Date.now()): boolean {
  if (!registrationApprovedAt) return false;
  const approvedAt = new Date(registrationApprovedAt).getTime();
  if (Number.isNaN(approvedAt)) return false;
  return now - approvedAt <= BUSINESS_GROWTH_PERIOD_DAYS * MS_PER_DAY;
}

export function resolveBusinessCommissionRate(
  kind: BusinessCommissionKind,
  context: BusinessCommissionContext,
  now = Date.now(),
): number {
  const baseRate =
    kind === 'product' ? BUSINESS_PRODUCT_COMMISSION_RATE : BUSINESS_HOTEL_COMMISSION_RATE;

  let rate = isBusinessGrowthPeriod(context.registrationApprovedAt, now)
    ? BUSINESS_GROWTH_COMMISSION_RATE
    : baseRate;

  if (context.ownerIsPremium) {
    rate = Math.max(0, rate - BUSINESS_PREMIUM_RATE_DISCOUNT);
  }

  return rate;
}

export function businessMinCommissionCents(grossCents: number): number {
  return grossCents < BUSINESS_MIN_COMMISSION_HIGH_THRESHOLD_CENTS
    ? BUSINESS_MIN_COMMISSION_HIGH_CENTS
    : BUSINESS_MIN_COMMISSION_CENTS;
}

export function applyBusinessMinCommission(grossCents: number, commissionCents: number): number {
  if (grossCents <= 1) return Math.max(0, grossCents);
  const minCents = businessMinCommissionCents(grossCents);
  const capped = Math.min(commissionCents, grossCents - 1);
  return Math.max(capped, minCents);
}

export function businessCommissionBreakdown(
  grossCents: number,
  kind: BusinessCommissionKind,
  context: BusinessCommissionContext,
  now = Date.now(),
) {
  const commissionRate = resolveBusinessCommissionRate(kind, context, now);
  const rawCommissionCents = Math.round(grossCents * commissionRate);
  const commissionCents = applyBusinessMinCommission(grossCents, rawCommissionCents);
  const netCents = grossCents - commissionCents;

  return { grossCents, commissionRate, commissionCents, netCents };
}

export function formatCommissionRatePct(rate: number): number {
  return Math.round(rate * 1000) / 10;
}

export function businessCommissionPolicySummary(context: BusinessCommissionContext): string {
  const inGrowth = isBusinessGrowthPeriod(context.registrationApprovedAt);
  const premiumNote = context.ownerIsPremium ? ' · Premium −2 puan' : '';
  if (inGrowth) {
    return `Büyüme teşviki %10 (ilk ${BUSINESS_GROWTH_PERIOD_DAYS} gün)${premiumNote}`;
  }
  return `Ürün %15 · Otel %12${premiumNote}`;
}

export function businessCommissionContextFromAccount(account: {
  registrationApprovedAt: string | null;
  ownerIsPremium: boolean;
}): BusinessCommissionContext {
  return {
    registrationApprovedAt: account.registrationApprovedAt,
    ownerIsPremium: account.ownerIsPremium,
  };
}
