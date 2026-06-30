-- Premium reklam kotası: profiles.is_premium ile premium_subscriptions uyumsuzluğunu gider

create or replace function public.resolve_premium_ad_plan(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_profile_premium boolean := false;
begin
  select ps.plan
  into v_plan
  from public.premium_subscriptions ps
  where ps.user_id = p_user_id
    and ps.status = 'active'
    and ps.expires_at > now()
  order by ps.expires_at desc
  limit 1;

  if v_plan is not null then
    return v_plan;
  end if;

  select coalesce(p.is_premium, false)
  into v_profile_premium
  from public.profiles p
  where p.id = p_user_id;

  if not v_profile_premium then
    return null;
  end if;

  select ps.plan
  into v_plan
  from public.premium_subscriptions ps
  where ps.user_id = p_user_id
  order by ps.expires_at desc nulls last
  limit 1;

  return coalesce(v_plan, 'monthly');
end;
$$;

create or replace function public.get_premium_ad_quota(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_plan text;
  v_limit integer := 0;
  v_used integer := 0;
  v_month_start timestamptz;
  v_debt integer := 0;
  v_has_card boolean := false;
begin
  if v_user_id is null then
    raise exception 'Oturum gerekli';
  end if;

  select coalesce(p.platform_debt_cents, 0),
         (p.ad_stripe_payment_method_id is not null and length(trim(p.ad_stripe_payment_method_id)) > 0)
  into v_debt, v_has_card
  from public.profiles p
  where p.id = v_user_id;

  v_plan := public.resolve_premium_ad_plan(v_user_id);

  if v_plan is null then
    return jsonb_build_object(
      'is_premium', false,
      'plan', null,
      'monthly_limit', 0,
      'used_this_month', 0,
      'remaining', 0,
      'period_label', to_char(timezone('Europe/Istanbul', now()), 'TMMonth YYYY'),
      'platform_debt_cents', v_debt,
      'has_card_on_file', v_has_card
    );
  end if;

  v_limit := public.premium_ad_monthly_limit(v_plan);
  v_month_start := date_trunc(
    'month',
    timezone('Europe/Istanbul', now())
  ) at time zone 'Europe/Istanbul';

  select count(*)::int
  into v_used
  from public.business_ads ba
  where ba.owner_id = v_user_id
    and ba.billing_mode = 'premium_quota'
    and ba.created_at >= v_month_start;

  return jsonb_build_object(
    'is_premium', true,
    'plan', v_plan,
    'monthly_limit', v_limit,
    'used_this_month', v_used,
    'remaining', greatest(v_limit - v_used, 0),
    'period_label', to_char(timezone('Europe/Istanbul', now()), 'TMMonth YYYY'),
    'platform_debt_cents', v_debt,
    'has_card_on_file', v_has_card
  );
end;
$$;

create or replace function public.enforce_premium_ad_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit integer;
  v_used integer;
  v_month_start timestamptz;
begin
  v_plan := public.resolve_premium_ad_plan(new.owner_id);

  if v_plan is null then
    raise exception 'Reklam yayınlamak için aktif Premium abonelik gerekli';
  end if;

  if coalesce(array_length(new.target_region_ids, 1), 0) = 0 and new.target_region_id is not null then
    new.target_region_ids := array[new.target_region_id];
  end if;

  if coalesce(array_length(new.target_region_ids, 1), 0) = 0 then
    raise exception 'En az bir hedef şehir seçmelisiniz';
  end if;

  if new.billing_mode = 'premium_quota' then
    v_limit := public.premium_ad_monthly_limit(v_plan);
    v_month_start := date_trunc(
      'month',
      timezone('Europe/Istanbul', now())
    ) at time zone 'Europe/Istanbul';

    select count(*)::int
    into v_used
    from public.business_ads ba
    where ba.owner_id = new.owner_id
      and ba.billing_mode = 'premium_quota'
      and ba.created_at >= v_month_start;

    if v_used >= v_limit then
      raise exception 'Ücretsiz reklam hakkınız bitti. Ücretli (tıklama başı) reklam modunu kullanın.';
    end if;

    new.cpc_cents := 0;
    return new;
  end if;

  if new.billing_mode = 'paid_cpc' then
    if coalesce(new.cpc_cents, 0) < 100 then
      raise exception 'Tıklama başı minimum ücret 1 ₺ olmalıdır';
    end if;
    if coalesce(new.budget_cents, 0) < 10000 then
      raise exception 'Ücretli reklam için minimum bütçe 100 ₺ olmalıdır';
    end if;
    return new;
  end if;

  raise exception 'Geçersiz reklam faturalama modu';
end;
$$;

grant execute on function public.resolve_premium_ad_plan(uuid) to authenticated;
grant execute on function public.get_premium_ad_quota(uuid) to authenticated;
