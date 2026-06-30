-- Reklam cüzdanı hareket metinleri (kurumsal)

create or replace function public.fulfill_ad_wallet_topup(
  p_user_id uuid,
  p_amount_cents integer,
  p_session_id text,
  p_idempotency_key text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_amount_cents <= 0 or p_session_id is null then
    raise exception 'Geçersiz yükleme';
  end if;

  if p_amount_cents < public.ad_min_topup_cents() then
    raise exception 'Minimum yükleme tutarı karşılanmadı';
  end if;

  return public.adjust_ad_wallet_balance(
    p_user_id,
    p_amount_cents,
    'topup',
    null,
    p_session_id,
    'Yükleme',
    coalesce(p_idempotency_key, 'ad_topup:' || p_session_id)
  );
end;
$$;

create or replace function public.record_ad_click(p_ad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad public.business_ads%rowtype;
  v_new_spent integer;
  v_cpc integer;
begin
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
      'ad_click:' || p_ad_id::text || ':' || gen_random_uuid()::text
    );
  exception
    when others then
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
    'cpc_cents', v_cpc
  );
end;
$$;
