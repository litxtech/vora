export type BusinessCommissionKind = 'product' | 'hotel';

export type BusinessCommissionContext = {
  registrationApprovedAt: string | null;
  ownerIsPremium: boolean;
};

export const BUSINESS_PRODUCT_COMMISSION_RATE = 0.15;
export const BUSINESS_HOTEL_COMMISSION_RATE = 0.12;
export const BUSINESS_GROWTH_COMMISSION_RATE = 0.1;
export const BUSINESS_GROWTH_PERIOD_DAYS = 90;
export const BUSINESS_PREMIUM_RATE_DISCOUNT = 0.02;
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

  return { commissionRate, commissionCents, netCents };
}
