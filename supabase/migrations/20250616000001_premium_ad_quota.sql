-- Premium abonelik reklam kotası (aylık plan: 10/ay, yıllık plan: 30/ay)

alter table public.business_ads
  alter column business_id drop not null;

alter table public.business_ads
  add column if not exists cta_label text not null default 'learn_more',
  add column if not exists destination_url text;

create index if not exists business_ads_owner_month_idx
  on public.business_ads (owner_id, created_at desc);

create or replace function public.premium_ad_monthly_limit(p_plan text)
returns integer
language sql
immutable
as $$
  select case when p_plan = 'yearly' then 30 else 10 end;
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
begin
  if v_user_id is null then
    raise exception 'Oturum gerekli';
  end if;

  select ps.plan
  into v_plan
  from public.premium_subscriptions ps
  where ps.user_id = v_user_id
    and ps.status = 'active'
    and ps.expires_at > now()
  order by ps.expires_at desc
  limit 1;

  if v_plan is null then
    return jsonb_build_object(
      'is_premium', false,
      'plan', null,
      'monthly_limit', 0,
      'used_this_month', 0,
      'remaining', 0,
      'period_label', to_char(timezone('Europe/Istanbul', now()), 'TMMonth YYYY')
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
    and ba.created_at >= v_month_start;

  return jsonb_build_object(
    'is_premium', true,
    'plan', v_plan,
    'monthly_limit', v_limit,
    'used_this_month', v_used,
    'remaining', greatest(v_limit - v_used, 0),
    'period_label', to_char(timezone('Europe/Istanbul', now()), 'TMMonth YYYY')
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
  select ps.plan
  into v_plan
  from public.premium_subscriptions ps
  where ps.user_id = new.owner_id
    and ps.status = 'active'
    and ps.expires_at > now()
  order by ps.expires_at desc
  limit 1;

  if v_plan is null then
    raise exception 'Reklam yayınlamak için aktif Premium abonelik gerekli';
  end if;

  v_limit := public.premium_ad_monthly_limit(v_plan);
  v_month_start := date_trunc(
    'month',
    timezone('Europe/Istanbul', now())
  ) at time zone 'Europe/Istanbul';

  select count(*)::int
  into v_used
  from public.business_ads ba
  where ba.owner_id = new.owner_id
    and ba.created_at >= v_month_start;

  if v_used >= v_limit then
    raise exception 'Aylık reklam limitinize ulaştınız (% / %)', v_used, v_limit;
  end if;

  return new;
end;
$$;

drop trigger if exists business_ads_premium_quota on public.business_ads;
create trigger business_ads_premium_quota
  before insert on public.business_ads
  for each row execute function public.enforce_premium_ad_quota();

grant execute on function public.get_premium_ad_quota(uuid) to authenticated;
