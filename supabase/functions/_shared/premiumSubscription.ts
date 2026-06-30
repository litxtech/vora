import type Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { planFromPriceId } from './stripe.ts';

type AdminClient = ReturnType<typeof createClient>;

type UpsertOptions = {
  userId: string;
  plan?: 'monthly' | 'yearly';
  /** checkout.session.completed veya upgrade faturası gibi ödeme kanıtı */
  paymentVerified?: boolean;
};

type LegacySubscription = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
};

type SubscriptionItemWithPeriod = Stripe.SubscriptionItem & {
  current_period_start?: number;
  current_period_end?: number;
};

function subscriptionPeriod(sub: Stripe.Subscription): { start: number; end: number } | null {
  const item = sub.items?.data?.[0] as SubscriptionItemWithPeriod | undefined;
  const legacy = sub as LegacySubscription;
  const start = item?.current_period_start ?? legacy.current_period_start;
  const end = item?.current_period_end ?? legacy.current_period_end;
  if (!start || !end) return null;
  return { start, end };
}

function subscriptionStatus(sub: Stripe.Subscription): 'active' | 'cancelled' | 'expired' {
  if (sub.status === 'canceled' || sub.status === 'unpaid') {
    return sub.status === 'canceled' ? 'expired' : 'cancelled';
  }
  if (sub.status === 'past_due' || sub.status === 'incomplete' || sub.status === 'incomplete_expired') {
    return 'cancelled';
  }
  if (sub.status === 'active') {
    return 'active';
  }
  if (sub.status === 'trialing') {
    return 'cancelled';
  }
  return 'expired';
}

/** Deneme/trial veya ödenmemiş abonelik premium vermez. */
export async function verifyStripeSubscriptionPaid(
  stripe: Stripe,
  sub: Stripe.Subscription,
): Promise<boolean> {
  if (sub.status !== 'active') {
    return false;
  }

  const latestInvoiceId = typeof sub.latest_invoice === 'string'
    ? sub.latest_invoice
    : sub.latest_invoice?.id;

  if (!latestInvoiceId) {
    return false;
  }

  try {
    const invoice = await stripe.invoices.retrieve(latestInvoiceId);
    return invoice.status === 'paid';
  } catch (error) {
    console.error('verifyStripeSubscriptionPaid invoice error:', error);
    return false;
  }
}

export async function upsertStripeSubscription(
  admin: AdminClient,
  stripe: Stripe,
  sub: Stripe.Subscription,
  options: UpsertOptions,
): Promise<{ userId: string | null; error: string | null }> {
  const ownerId = sub.metadata?.user_id;
  if (!ownerId || ownerId !== options.userId) {
    console.error(
      'upsertStripeSubscription: owner mismatch or missing metadata',
      sub.id,
      ownerId,
      options.userId,
    );
    return { userId: null, error: 'subscription owner mismatch' };
  }

  const dbStatus = subscriptionStatus(sub);

  if (dbStatus === 'active') {
    const entitled = options.paymentVerified || await verifyStripeSubscriptionPaid(stripe, sub);
    if (!entitled) {
      console.error('upsertStripeSubscription: active but unpaid', sub.id);
      return { userId: ownerId, error: 'subscription not paid' };
    }
  }

  const priceId = sub.items.data[0]?.price?.id ?? '';
  const plan =
    (sub.metadata?.plan as 'monthly' | 'yearly' | undefined) ??
    options.plan ??
    planFromPriceId(priceId);

  const period = subscriptionPeriod(sub);
  if (!period) {
    console.error('upsertStripeSubscription: missing billing period for subscription', sub.id);
    return { userId: ownerId, error: 'missing billing period' };
  }

  const row = {
    user_id: ownerId,
    plan,
    status: dbStatus,
    payment_provider: 'stripe' as const,
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
    starts_at: new Date(period.start * 1000).toISOString(),
    expires_at: new Date(period.end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
  };

  const { data: existing, error: lookupError } = await admin
    .from('premium_subscriptions')
    .select('id')
    .eq('stripe_subscription_id', sub.id)
    .maybeSingle();

  if (lookupError) {
    console.error('upsertStripeSubscription lookup error:', lookupError.message);
    return { userId: ownerId, error: lookupError.message };
  }

  const writeResult = existing?.id
    ? await admin.from('premium_subscriptions').update(row).eq('id', existing.id)
    : await admin.from('premium_subscriptions').insert(row);

  if (writeResult.error) {
    console.error('upsertStripeSubscription write error:', writeResult.error.message);
    return { userId: ownerId, error: writeResult.error.message };
  }

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  if (customerId) {
    await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', ownerId);
  }

  const { error: syncError } = await admin.rpc('sync_premium_status', { p_user_id: ownerId });
  if (syncError) {
    console.error('upsertStripeSubscription sync error:', syncError.message);
    return { userId: ownerId, error: syncError.message };
  }

  return { userId: ownerId, error: null };
}
