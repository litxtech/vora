-- Stripe premium abonelik alanları

alter table public.profiles
  add column if not exists stripe_customer_id text;

create unique index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

alter table public.premium_subscriptions
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_customer_id text,
  add column if not exists cancel_at_period_end boolean not null default false;

create unique index if not exists premium_subscriptions_stripe_sub_idx
  on public.premium_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Abonelik kayıtları yalnızca Stripe webhook (service role) üzerinden yazılır
drop policy if exists "premium_subscriptions_self_insert" on public.premium_subscriptions;
