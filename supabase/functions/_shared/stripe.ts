import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

export const stripeCryptoProvider = Stripe.createSubtleCryptoProvider();

export function getStripe(): Stripe {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY missing');
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' });
}

export function planFromPriceId(priceId: string): 'monthly' | 'yearly' {
  const monthly = Deno.env.get('STRIPE_PRICE_MONTHLY');
  return priceId === monthly ? 'monthly' : 'yearly';
}

export function priceIdForPlan(plan: 'monthly' | 'yearly'): string {
  const priceId = plan === 'monthly'
    ? Deno.env.get('STRIPE_PRICE_MONTHLY')
    : Deno.env.get('STRIPE_PRICE_YEARLY');
  if (!priceId) throw new Error(`Stripe price missing for plan: ${plan}`);
  return priceId;
}
