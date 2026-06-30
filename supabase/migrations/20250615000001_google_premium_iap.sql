-- Google Play premium abonelik alanları

alter type public.premium_payment_provider add value if not exists 'google';

alter table public.premium_subscriptions
  add column if not exists google_purchase_token text,
  add column if not exists google_product_id text;

create unique index if not exists premium_subscriptions_google_token_idx
  on public.premium_subscriptions (google_purchase_token)
  where google_purchase_token is not null;
