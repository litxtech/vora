-- Genel reklam yayını: hedef şehir seçimi zorunlu değil (boş = tüm bölgeler)

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

  -- Boş hedef = genel yayın (tüm bölgeler)
  if coalesce(array_length(new.target_region_ids, 1), 0) = 0 then
    new.target_region_id := null;
    new.target_region_ids := '{}';
  end if;

  if new.billing_mode = 'premium_quota' then
    v_limit := public.premium_ad_monthly_limit(v_plan);
    v_month_start := date_trunc(
      'month',
      timezone('Europe/Istanbul', now())
    ) at time zone 'Europe/Istanbul';

    v_used := public.premium_ad_quota_used(new.owner_id, v_month_start);

    if v_used >= v_limit then
      raise exception 'Ücretsiz reklam hakkınız bitti. Ücretli reklam modunu kullanın.';
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
