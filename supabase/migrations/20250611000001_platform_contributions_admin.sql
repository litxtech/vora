-- Platform destek katkıları — admin listesi ve gelir kaydı

alter type public.revenue_type add value if not exists 'platform_contribution';

drop policy if exists "platform_contributions_admin_select" on public.platform_contributions;
create policy "platform_contributions_admin_select"
  on public.platform_contributions
  for select
  to authenticated
  using (public.is_admin());

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
declare
  v_contribution_id uuid;
  v_amount numeric;
begin
  update public.platform_contributions
  set
    status = 'completed',
    stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
    amount_cents = coalesce(nullif(p_amount_cents, 0), amount_cents),
    completed_at = now()
  where stripe_checkout_session_id = p_session_id
    and user_id = p_user_id
  returning id, (amount_cents::numeric / 100.0) into v_contribution_id, v_amount;

  if not found then
    insert into public.platform_contributions (
      user_id, tier, amount_cents, stripe_checkout_session_id,
      stripe_payment_intent_id, status, completed_at
    )
    values (
      p_user_id, p_tier, p_amount_cents, p_session_id,
      p_payment_intent_id, 'completed', now()
    )
    returning id, (amount_cents::numeric / 100.0) into v_contribution_id, v_amount;
  end if;

  insert into public.revenue_records (revenue_type, amount, currency, reference_id, reference_label, notes)
  values (
    'platform_contribution'::public.revenue_type,
    coalesce(v_amount, p_amount_cents::numeric / 100.0),
    'try',
    v_contribution_id,
    p_tier,
    'Platform destek katkısı'
  )
  on conflict do nothing;
end;
$$;

create or replace function public.admin_list_platform_contributions(p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  tier text,
  amount_cents integer,
  status text,
  created_at timestamptz,
  completed_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  return query
  select
    c.id, c.user_id, p.username, p.full_name, c.tier, c.amount_cents,
    c.status, c.created_at, c.completed_at
  from public.platform_contributions c
  join public.profiles p on p.id = c.user_id
  order by c.created_at desc
  limit p_limit;
end; $$;

create or replace function public.admin_revoke_platform_supporter(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  delete from public.user_badges
  where user_id = p_user_id and badge_type = 'platform_supporter';
end; $$;

grant execute on function public.admin_list_platform_contributions(int) to authenticated;
grant execute on function public.admin_revoke_platform_supporter(uuid) to authenticated;
