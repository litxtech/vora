import { IAP_PREMIUM_PRODUCT_SUFFIX, iapProductId } from '@/constants/app';
import type { PremiumPlan } from '@/features/profile/services/premiumService';
import { supabaseErrorMessage } from '@/lib/errors';

/** App Store Connect / Google Play Console Product ID'leri ile senkron tutulmalı */
export const PREMIUM_PRODUCT_IDS_BY_PLAN: Record<PremiumPlan, string> = {
  monthly: iapProductId(IAP_PREMIUM_PRODUCT_SUFFIX.monthly),
  yearly: iapProductId(IAP_PREMIUM_PRODUCT_SUFFIX.yearly),
};

/** @deprecated PREMIUM_PRODUCT_IDS_BY_PLAN kullanın */
export const APPLE_PREMIUM_PRODUCT_IDS = PREMIUM_PRODUCT_IDS_BY_PLAN;

export const PREMIUM_PRODUCT_IDS = Object.values(PREMIUM_PRODUCT_IDS_BY_PLAN);

/** @deprecated PREMIUM_PRODUCT_IDS kullanın */
export const APPLE_PREMIUM_SKUS = PREMIUM_PRODUCT_IDS;

export function productIdForPlan(plan: PremiumPlan): string {
  return PREMIUM_PRODUCT_IDS_BY_PLAN[plan];
}

/** @deprecated productIdForPlan kullanın */
export function appleProductIdForPlan(plan: PremiumPlan): string {
  return productIdForPlan(plan);
}

export function planFromProductId(productId: string): PremiumPlan | null {
  if (productId === PREMIUM_PRODUCT_IDS_BY_PLAN.monthly) return 'monthly';
  if (productId === PREMIUM_PRODUCT_IDS_BY_PLAN.yearly) return 'yearly';
  return null;
}

/** @deprecated planFromProductId kullanın */
export function planFromAppleProductId(productId: string): PremiumPlan | null {
  return planFromProductId(productId);
}

export type ApplePurchasePayload = {
  transactionId: string;
  purchaseToken?: string | null;
  productId: string;
  sandbox?: boolean;
};

export type StoreVerifyResult = {
  error: string | null;
  plan?: PremiumPlan;
  expiresAt?: string;
};

export async function verifyApplePremiumPurchase(
  payload: ApplePurchasePayload,
): Promise<StoreVerifyResult> {
  const { supabase } = await import('@/lib/supabase/client');

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    error?: string;
    plan?: PremiumPlan;
    expiresAt?: string;
  }>('apple-verify-subscription', { body: payload });

  if (error) return { error: supabaseErrorMessage(error)! };
  if (data?.error) return { error: data.error };
  if (!data?.ok) return { error: 'Apple aboneliği doğrulanamadı.' };

  const plan = data.plan ?? planFromProductId(payload.productId) ?? undefined;
  return { error: null, plan, expiresAt: data.expiresAt };
}

export type GooglePurchasePayload = {
  purchaseToken: string;
  productId: string;
};

export async function verifyGooglePremiumPurchase(
  payload: GooglePurchasePayload,
): Promise<StoreVerifyResult> {
  const { supabase } = await import('@/lib/supabase/client');

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    error?: string;
    plan?: PremiumPlan;
    expiresAt?: string;
  }>('google-verify-subscription', { body: payload });

  if (error) return { error: supabaseErrorMessage(error)! };
  if (data?.error) return { error: data.error };
  if (!data?.ok) return { error: 'Google Play aboneliği doğrulanamadı.' };

  const plan = data.plan ?? planFromProductId(payload.productId) ?? undefined;
  return { error: null, plan, expiresAt: data.expiresAt };
}
