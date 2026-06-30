-- Gönüllü platform desteği (Stripe tek seferlik ödeme)

create table if not exists public.platform_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tier text not null check (tier in ('supporter_159', 'supporter_259', 'supporter_359')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'try',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists platform_contributions_user_id_idx
  on public.platform_contributions (user_id, created_at desc);

create index if not exists platform_contributions_status_idx
  on public.platform_contributions (status)
  where status = 'pending';

alter table public.platform_contributions enable row level security;

create policy "platform_contributions_self_select"
  on public.platform_contributions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Yazma yalnızca service role (Stripe webhook / edge function)

create or replace function public.fulfill_platform_contribution(
  p_user_id uuid,
  p_tier text,
  p_session_id text,
  p_payment_intent_id text,
  p_amount_cents integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.platform_contributions
  set
    status = 'completed',
    stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
    amount_cents = coalesce(nullif(p_amount_cents, 0), amount_cents),
    completed_at = now()
  where stripe_checkout_session_id = p_session_id
    and user_id = p_user_id;

  if not found then
    insert into public.platform_contributions (
      user_id,
      tier,
      amount_cents,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      status,
      completed_at
    )
    values (
      p_user_id,
      p_tier,
      p_amount_cents,
      p_session_id,
      p_payment_intent_id,
      'completed',
      now()
    );
  end if;
end;
$$;
