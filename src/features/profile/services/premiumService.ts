import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { openUrl } from '@/lib/linking/openUrl';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type PremiumPlan = 'monthly' | 'yearly';

export type PremiumPaymentProvider = 'stripe' | 'apple' | 'google';

export type PremiumSubscription = {
  id: string;
  plan: PremiumPlan;
  status: 'active' | 'cancelled' | 'expired';
  startsAt: string;
  expiresAt: string;
  cancelAtPeriodEnd: boolean;
  paymentProvider: PremiumPaymentProvider;
  stripeSubscriptionId: string | null;
};

/** Stripe Dashboard fiyatlarıyla aynı tutulmalı (TRY) */
export const PREMIUM_PRICING = {
  monthly: 249.99,
  yearly: 1999.99,
} as const;

const YEARLY_MONTHLY_EQUIV = PREMIUM_PRICING.yearly / 12;
const YEARLY_SAVINGS_PERCENT = Math.round(
  (1 - PREMIUM_PRICING.yearly / (PREMIUM_PRICING.monthly * 12)) * 100,
);

function formatTry(amount: number): string {
  return `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type PremiumFeatureId = 'calls' | 'badge' | 'stats' | 'boost' | 'viewers' | 'ads';

export type PremiumFeature = {
  id: PremiumFeatureId;
    icon:
    | 'diamond-outline'
    | 'stats-chart-outline'
    | 'trending-up-outline'
    | 'eye-outline'
    | 'call-outline'
    | 'megaphone-outline';
  text: string;
  usageHint: string;
  actionLabel: string;
  actionRoute: '/(tabs)/profile' | '/(tabs)/messages' | '/settings/insights' | '/ads';
};

export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: 'calls',
    icon: 'call-outline',
    text: 'Sesli ve görüntülü arama',
    usageHint: 'Mesajlaşma ekranından görüşme başlatın',
    actionLabel: 'Mesajlara git',
    actionRoute: '/(tabs)/messages',
  },
  {
    id: 'badge',
    icon: 'diamond-outline',
    text: 'Altın profil çerçevesi ve Premium rozeti',
    usageHint: 'Profilinizde otomatik görünür',
    actionLabel: 'Profilime git',
    actionRoute: '/(tabs)/profile',
  },
  {
    id: 'stats',
    icon: 'stats-chart-outline',
    text: 'Gelişmiş içerik istatistikleri',
    usageHint: 'Beğeni, görüntülenme ve izleyici demografisi',
    actionLabel: 'İstatistikleri gör',
    actionRoute: '/settings/insights',
  },
  {
    id: 'boost',
    icon: 'trending-up-outline',
    text: 'Profili 7 gün öne çıkarma',
    usageHint: 'Reklam Merkezi\'nden başlatın, istediğiniz zaman durdurun',
    actionLabel: 'Öne çıkarmayı yönet',
    actionRoute: '/ads',
  },
  {
    id: 'viewers',
    icon: 'eye-outline',
    text: 'Profil ziyaretçileri',
    usageHint: 'Kimlerin profilinize baktığını görün',
    actionLabel: 'Ziyaretçileri gör',
    actionRoute: '/settings/insights',
  },
  {
    id: 'ads',
    icon: 'megaphone-outline',
    text: 'Reklam yayınlama',
    usageHint: 'Aylık planda 10, yıllık planda ayda 30 reklam hakkı',
    actionLabel: 'Reklam Merkezi',
    actionRoute: '/ads',
  },
];

/** Abonelik dönemi içinde geçen süre oranı (0–1). */
export function subscriptionPeriodProgress(subscription: PremiumSubscription): number {
  const start = new Date(subscription.startsAt).getTime();
  const end = new Date(
    resolvePremiumExpiresAt(subscription.startsAt, subscription.expiresAt, subscription.plan),
  ).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
}

export function paymentProviderIcon(
  provider: PremiumPaymentProvider,
): 'logo-apple' | 'logo-google-playstore' | 'card-outline' {
  if (provider === 'apple') return 'logo-apple';
  if (provider === 'google') return 'logo-google-playstore';
  return 'card-outline';
}

export const PREMIUM_PLANS: {
  id: PremiumPlan;
  label: string;
  price: string;
  description: string;
  badge?: string;
}[] = [
  {
    id: 'monthly',
    label: 'Aylık',
    price: formatTry(PREMIUM_PRICING.monthly),
    description: 'Her ay yenilenir, istediğin zaman iptal',
  },
  {
    id: 'yearly',
    label: 'Yıllık',
    price: formatTry(PREMIUM_PRICING.yearly),
    description: `${formatTry(YEARLY_MONTHLY_EQUIV)}/ay · %${YEARLY_SAVINGS_PERCENT} tasarruf`,
    badge: `En avantajlı`,
  },
];

function checkoutReturnUrl(result: 'success' | 'cancelled'): string {
  return Linking.createURL('settings/premium', { queryParams: { checkout: result } });
}

export async function fetchActiveSubscription(userId: string): Promise<PremiumSubscription | null> {
  const { data } = await supabase
    .from('premium_subscriptions')
    .select(
      'id, plan, status, starts_at, expires_at, cancel_at_period_end, stripe_subscription_id, payment_provider',
    )
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const plan = data.plan as PremiumPlan;
  const startsAt = data.starts_at;
  const expiresAt = resolvePremiumExpiresAt(startsAt, data.expires_at, plan);

  return {
    id: data.id,
    plan,
    status: data.status as PremiumSubscription['status'],
    startsAt,
    expiresAt,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
    paymentProvider: (data.payment_provider as PremiumPaymentProvider | null) ?? 'stripe',
    stripeSubscriptionId: data.stripe_subscription_id ?? null,
  };
}

/** Stripe Checkout oturumu başlatır ve ödeme sayfasını açar */
export async function startStripeCheckout(
  plan: PremiumPlan,
): Promise<{ error: string | null; shouldVerify: boolean }> {
  const successUrl = checkoutReturnUrl('success');
  const cancelUrl = checkoutReturnUrl('cancelled');

  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'stripe-create-checkout',
    { body: { plan, successUrl, cancelUrl } },
  );

  if (error) return { error: supabaseErrorMessage(error)!, shouldVerify: false };
  if (data?.error) return { error: data.error, shouldVerify: false };
  if (!data?.url) return { error: 'Ödeme sayfası oluşturulamadı.', shouldVerify: false };

  try {
    const result = await WebBrowser.openAuthSessionAsync(data.url, successUrl);
    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { error: null, shouldVerify: false };
    }
    if (result.type === 'success' && result.url?.includes('checkout=cancelled')) {
      return { error: null, shouldVerify: false };
    }
    if (result.type === 'success' && result.url?.includes('checkout=success')) {
      return { error: null, shouldVerify: true };
    }
    return { error: null, shouldVerify: false };
  } catch {
    await openUrl(data.url);
    return { error: null, shouldVerify: true };
  }
}

/** Stripe'tan abonelik kaydını sunucu üzerinden senkronize eder (webhook yedek). */
export async function syncStripeSubscriptionFromServer(): Promise<{
  error: string | null;
  active: boolean;
  plan?: PremiumPlan | null;
}> {
  const { data, error } = await supabase.functions.invoke<{
    error?: string;
    active?: boolean;
    plan?: PremiumPlan | null;
  }>('stripe-sync-subscription');

  if (error) return { error: supabaseErrorMessage(error)!, active: false };
  if (data?.error) return { error: data.error, active: false };
  return {
    error: null,
    active: data?.active ?? false,
    plan: data?.plan ?? null,
  };
}

/** Stripe aboneliğini dönem sonunda iptal eder */
export async function cancelPremiumSubscription(
  _subscriptionId: string,
  _userId: string,
): Promise<{ error: string | null; expiresAt?: string }> {
  const { data, error } = await supabase.functions.invoke<{
    error?: string;
    expiresAt?: string;
  }>('stripe-cancel-subscription');

  if (error) return { error: supabaseErrorMessage(error)! };
  if (data?.error) return { error: data.error };
  return { error: null, expiresAt: data?.expiresAt };
}

export function premiumPlanLabel(plan: PremiumPlan): string {
  return plan === 'monthly' ? 'Aylık' : 'Yıllık';
}

export function premiumPlanPrice(plan: PremiumPlan): string {
  return PREMIUM_PLANS.find((item) => item.id === plan)?.price ?? '';
}

export function premiumPlanBillingLabel(plan: PremiumPlan): string {
  return plan === 'monthly' ? `${premiumPlanPrice(plan)}/ay` : `${premiumPlanPrice(plan)}/yıl`;
}

export function paymentProviderLabel(provider: PremiumPaymentProvider): string {
  if (provider === 'apple') return 'App Store';
  if (provider === 'google') return 'Google Play';
  return 'Stripe';
}

const PREMIUM_BILLING_TIMEZONE = 'Europe/Istanbul';

type CalendarParts = { year: number; month: number; day: number };

function calendarPartsInTimezone(iso: string, timeZone: string): CalendarParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return { year: read('year'), month: read('month'), day: read('day') };
}

function clampDayInMonth(year: number, month: number, day: number): number {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Math.min(day, lastDay);
}

function addMonthsCalendarParts(parts: CalendarParts, months: number): CalendarParts {
  const targetMonthIndex = parts.month - 1 + months;
  const year = parts.year + Math.floor(targetMonthIndex / 12);
  const month = (targetMonthIndex % 12) + 1;
  return {
    year,
    month,
    day: clampDayInMonth(year, month, parts.day),
  };
}

function addYearsCalendarParts(parts: CalendarParts, years: number): CalendarParts {
  const year = parts.year + years;
  return {
    year,
    month: parts.month,
    day: clampDayInMonth(year, parts.month, parts.day),
  };
}

function calendarPartsToIso(parts: CalendarParts): string {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0)).toISOString();
}

const MIN_PREMIUM_PERIOD_MS = 86_400_000;

/**
 * Mağaza doğrulamasında bitiş tarihi eksik veya başlangıçla aynı gelirse
 * fatura dönemini satın alma gününden hesaplar.
 */
export function resolvePremiumExpiresAt(
  startsAt: string,
  expiresAt: string,
  plan: PremiumPlan,
): string {
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(expiresAt).getTime();

  if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs - startMs >= MIN_PREMIUM_PERIOD_MS) {
    return expiresAt;
  }

  const start = calendarPartsInTimezone(startsAt, PREMIUM_BILLING_TIMEZONE);
  const endParts =
    plan === 'monthly' ? addMonthsCalendarParts(start, 1) : addYearsCalendarParts(start, 1);
  return calendarPartsToIso(endParts);
}

function formatCalendarPartsTR(parts: CalendarParts): string {
  const noonUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  return noonUtc.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Abonelik başlangıç / bitiş günü — Türkiye takvimine göre. */
export function formatPremiumDate(iso: string): string {
  return formatCalendarPartsTR(calendarPartsInTimezone(iso, PREMIUM_BILLING_TIMEZONE));
}

/**
 * Yenileme tarihi: aylıkta satın alma günü, yıllıkta satın alma günü+ayı korunur.
 * Apple/Google UTC zaman damgası ertesi güne kaydırmaz.
 */
export function formatPremiumRenewalDate(
  startsAt: string,
  expiresAt: string,
  plan: PremiumPlan,
): string {
  const effectiveExpiresAt = resolvePremiumExpiresAt(startsAt, expiresAt, plan);
  const start = calendarPartsInTimezone(startsAt, PREMIUM_BILLING_TIMEZONE);
  const expire = calendarPartsInTimezone(effectiveExpiresAt, PREMIUM_BILLING_TIMEZONE);

  if (plan === 'monthly') {
    return formatCalendarPartsTR({
      year: expire.year,
      month: expire.month,
      day: clampDayInMonth(expire.year, expire.month, start.day),
    });
  }

  return formatCalendarPartsTR({
    year: expire.year,
    month: start.month,
    day: clampDayInMonth(expire.year, start.month, start.day),
  });
}

export function alreadyPremiumAlertMessage(
  subscription: PremiumSubscription | null,
): { title: string; message: string } {
  if (subscription) {
    const plan = premiumPlanLabel(subscription.plan);
    const provider = paymentProviderLabel(subscription.paymentProvider);
    const renewLabel = subscription.cancelAtPeriodEnd ? 'Bitiş' : 'Yenileme';
    const renewDate = formatPremiumRenewalDate(
      subscription.startsAt,
      subscription.expiresAt,
      subscription.plan,
    );
    const upgradeHint =
      subscription.plan === 'monthly' && subscription.paymentProvider === 'stripe'
        ? ' Yıllık pakete geçmek için Aboneliklerim ekranındaki yükseltme seçeneğini kullanabilirsiniz.'
        : '';
    return {
      title: 'Zaten Premium üyesisiniz',
      message: `${plan} Vora Premium aboneliğiniz (${provider}) aktif. ${renewLabel}: ${renewDate}.${upgradeHint}`,
    };
  }
  return {
    title: 'Zaten Premium üyesisiniz',
    message: 'Aktif bir Premium aboneliğiniz var. Tüm özellikler hesabınızda kullanıma açık.',
  };
}

export type PremiumUpgradePreview = {
  currentPlan: PremiumPlan;
  targetPlan: PremiumPlan;
  amountDueCents: number;
  creditCents: number;
  currency: string;
  amountDueFormatted: string;
  creditFormatted: string | null;
};

/** Aylık → yıllık geçişte prorasyon önizlemesi (kalan tutar). */
export async function previewPremiumUpgrade(): Promise<{
  data: PremiumUpgradePreview | null;
  error: string | null;
}> {
  const { data, error } = await supabase.functions.invoke<PremiumUpgradePreview & { error?: string }>(
    'stripe-upgrade-subscription',
    { body: { action: 'preview', targetPlan: 'yearly' } },
  );

  if (error) return { data: null, error: supabaseErrorMessage(error)! };
  if (data?.error) return { data: null, error: data.error };
  if (!data?.amountDueFormatted) return { data: null, error: 'Yükseltme önizlemesi alınamadı.' };
  return { data, error: null };
}

/** Aylık aboneliği yıllığa yükseltir; kullanılmayan süre düşülür. */
export async function upgradePremiumSubscription(): Promise<{
  error: string | null;
  plan?: PremiumPlan;
  expiresAt?: string;
  amountDueFormatted?: string;
}> {
  const { data, error } = await supabase.functions.invoke<{
    error?: string;
    plan?: PremiumPlan;
    expiresAt?: string;
    amountDueFormatted?: string;
  }>('stripe-upgrade-subscription', { body: { action: 'upgrade', targetPlan: 'yearly' } });

  if (error) return { error: supabaseErrorMessage(error)! };
  if (data?.error) return { error: data.error };
  return {
    error: null,
    plan: data?.plan,
    expiresAt: data?.expiresAt,
    amountDueFormatted: data?.amountDueFormatted,
  };
}

type PollOptions = {
  maxAttempts?: number;
  intervalMs?: number;
};

/** Stripe webhook gecikmesinde aboneliğin aktifleşmesini bekler. */
export async function pollForActiveSubscription(
  userId: string,
  options: PollOptions = {},
): Promise<PremiumSubscription | null> {
  const { maxAttempts = 12, intervalMs = 2000 } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const sub = await fetchActiveSubscription(userId);
    if (sub) return sub;
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return null;
}

export async function isUserPremiumActive(userId: string): Promise<boolean> {
  const sub = await fetchActiveSubscription(userId);
  if (sub) return true;

  const { data } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .maybeSingle();

  return data?.is_premium ?? false;
}
