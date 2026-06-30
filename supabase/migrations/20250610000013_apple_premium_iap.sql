-- Apple IAP premium abonelik alanları

do $$ begin
  create type public.premium_payment_provider as enum ('stripe', 'apple');
exception when duplicate_object then null;
end $$;

alter table public.premium_subscriptions
  add column if not exists payment_provider public.premium_payment_provider not null default 'stripe',
  add column if not exists apple_original_transaction_id text,
  add column if not exists apple_product_id text;

create unique index if not exists premium_subscriptions_apple_orig_tx_idx
  on public.premium_subscriptions (apple_original_transaction_id)
  where apple_original_transaction_id is not null;
