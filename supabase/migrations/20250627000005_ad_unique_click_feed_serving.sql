-- Tekil tıklama: aynı kullanıcı aynı reklama birden fazla ücret yazmaz

alter table public.business_ad_user_views
  add column if not exists clicked_at timestamptz;

create index if not exists business_ad_user_views_unclicked_idx
  on public.business_ad_user_views (ad_id)
  where clicked_at is null;

create or replace function public.pick_business_ad_for_user(
  p_ad_type public.ad_type,
  p_region_id text default null
)
returns setof public.business_ads
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return;
  end if;

  perform public.expire_business_ads();

  return query
  select ba.*
  from public.business_ads ba
  where ba.status = 'active'
    and ba.ad_type = p_ad_type
    and (ba.ends_at is null or ba.ends_at > now())
    and ba.owner_id <> v_user_id
    and ba.spent_cents < ba.budget_cents
    and (
      coalesce(cardinality(ba.target_region_ids), 0) = 0
      or p_region_id is null
      or p_region_id = any (ba.target_region_ids)
      or ba.target_region_id = p_region_id
    )
    and not exists (
      select 1
      from public.business_ad_user_views v
      where v.ad_id = ba.id
        and v.user_id = v_user_id
    )
  order by ba.created_at desc
  limit 1;
end;
$$;

create or replace function public.record_ad_click(p_ad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_ad public.business_ads%rowtype;
  v_new_spent integer;
  v_cpc integer;
  v_first_click boolean := false;
  v_row_count integer;
begin
  if v_user_id is null then
    raise exception 'Oturum gerekli';
  end if;

  perform public.expire_business_ads();

  select * into v_ad
  from public.business_ads
  where id = p_ad_id
    and status = 'active'
    and (ends_at is null or ends_at > now())
  for update;

  if not found then
    raise exception 'Aktif reklam bulunamadı';
  end if;

  if v_ad.owner_id = v_user_id then
    return jsonb_build_object(
      'clicks', v_ad.clicks,
      'spent_cents', v_ad.spent_cents,
      'billing_mode', 'wallet_cpc',
      'cpc_cents', public.ad_cpc_cents(),
      'charged', false
    );
  end if;

  insert into public.business_ad_user_views (ad_id, user_id)
  values (p_ad_id, v_user_id)
  on conflict do nothing;

  update public.business_ad_user_views
  set clicked_at = now()
  where ad_id = p_ad_id
    and user_id = v_user_id
    and clicked_at is null;

  get diagnostics v_row_count = row_count;
  v_first_click := v_row_count > 0;

  if not v_first_click then
    return jsonb_build_object(
      'clicks', v_ad.clicks,
      'spent_cents', v_ad.spent_cents,
      'billing_mode', 'wallet_cpc',
      'cpc_cents', public.ad_cpc_cents(),
      'charged', false
    );
  end if;

  v_cpc := public.ad_cpc_cents();

  if v_ad.spent_cents + v_cpc > v_ad.budget_cents then
    update public.business_ads
    set status = 'paused'::public.ad_status,
        updated_at = now()
    where id = p_ad_id;

    raise exception 'Reklam bütçesi tükendi';
  end if;

  begin
    perform public.adjust_ad_wallet_balance(
      v_ad.owner_id,
      -v_cpc,
      'ad_click',
      v_ad.id,
      null,
      'Reklam tıklaması için kullanıldı',
      'ad_click:' || p_ad_id::text || ':' || v_user_id::text
    );
  exception
    when others then
      update public.business_ad_user_views
      set clicked_at = null
      where ad_id = p_ad_id
        and user_id = v_user_id;

      update public.business_ads
      set status = 'paused'::public.ad_status,
          updated_at = now()
      where id = p_ad_id;
      raise;
  end;

  update public.business_ads
  set clicks = clicks + 1,
      spent_cents = spent_cents + v_cpc,
      status = case
        when spent_cents + v_cpc >= budget_cents then 'paused'::public.ad_status
        else status
      end,
      updated_at = now()
  where id = p_ad_id
  returning spent_cents into v_new_spent;

  return jsonb_build_object(
    'clicks', v_ad.clicks + 1,
    'spent_cents', v_new_spent,
    'billing_mode', 'wallet_cpc',
    'cpc_cents', v_cpc,
    'charged', true
  );
end;
$$;
