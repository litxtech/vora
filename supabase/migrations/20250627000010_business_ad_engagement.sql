-- Reklam kartları için yorum/beğeni etkileşim gönderisi (feed'de görünmez)

alter table public.posts
  add column if not exists business_ad_id uuid references public.business_ads (id) on delete cascade;

create unique index if not exists posts_business_ad_id_unique_idx
  on public.posts (business_ad_id)
  where business_ad_id is not null;

create or replace function public.ensure_business_ad_engagement_post(p_ad_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad public.business_ads%rowtype;
  v_post_id uuid;
  v_region text;
  v_media text[];
begin
  select * into v_ad
  from public.business_ads
  where id = p_ad_id;

  if not found then
    raise exception 'Reklam bulunamadı';
  end if;

  select id into v_post_id
  from public.posts
  where business_ad_id = p_ad_id
  limit 1;

  if v_post_id is not null then
    return v_post_id;
  end if;

  v_region := coalesce(
    v_ad.target_region_ids[1],
    v_ad.target_region_id,
    'trabzon'
  );
  v_media := case
    when v_ad.image_url is not null and length(trim(v_ad.image_url)) > 0 then array[v_ad.image_url]
    else '{}'::text[]
  end;

  insert into public.posts (
    author_id,
    region_id,
    title,
    content,
    media_urls,
    category,
    status,
    business_ad_id
  )
  values (
    v_ad.owner_id,
    v_region,
    v_ad.title,
    v_ad.description,
    v_media,
    'business'::public.post_category,
    'published'::public.content_status,
    p_ad_id
  )
  returning id into v_post_id;

  return v_post_id;
end;
$$;

create or replace function public.start_business_ad_session(p_ad_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad public.business_ads%rowtype;
  v_balance integer;
  v_remaining integer;
begin
  select * into v_ad
  from public.business_ads
  where id = p_ad_id
  for update;

  if not found then
    raise exception 'Reklam bulunamadı';
  end if;

  v_remaining := greatest(v_ad.budget_cents - v_ad.spent_cents, 0);

  if v_remaining <= 0 then
    raise exception 'Reklam bütçesi tükendi';
  end if;

  v_balance := public.get_ad_wallet_balance(v_ad.owner_id);

  if v_balance < public.ad_cpc_cents() then
    raise exception 'Reklam yayınlamak için cüzdana bakiye yükleyin (tıklama başı % kuruş)', public.ad_cpc_cents();
  end if;

  perform public.ensure_business_ad_engagement_post(p_ad_id);

  insert into public.business_ad_sessions (ad_id, owner_id, billing_mode, debt_cents, started_at, ends_at)
  values (
    v_ad.id,
    v_ad.owner_id,
    'wallet_cpc',
    0,
    now(),
    now() + interval '24 hours'
  );

  update public.business_ads
  set status = 'active'::public.ad_status,
      starts_at = now(),
      ends_at = now() + interval '24 hours',
      updated_at = now()
  where id = p_ad_id;
end;
$$;

create or replace function public.restart_business_ad(p_ad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad public.business_ads%rowtype;
  v_balance integer;
  v_remaining integer;
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  perform public.expire_business_ads();

  select * into v_ad
  from public.business_ads
  where id = p_ad_id
    and owner_id = auth.uid()
  for update;

  if not found then
    raise exception 'Reklam bulunamadı';
  end if;

  if v_ad.status not in ('ended', 'paused') then
    raise exception 'Yalnızca sona ermiş veya duraklatılmış reklamlar yeniden başlatılabilir';
  end if;

  v_remaining := greatest(v_ad.budget_cents - v_ad.spent_cents, 0);

  if v_remaining <= 0 then
    raise exception 'Reklam bütçesi tükendi';
  end if;

  v_balance := public.get_ad_wallet_balance(v_ad.owner_id);

  if v_balance < public.ad_cpc_cents() then
    raise exception 'Yeniden başlatmak için cüzdana bakiye yükleyin';
  end if;

  perform public.ensure_business_ad_engagement_post(p_ad_id);

  insert into public.business_ad_sessions (ad_id, owner_id, billing_mode, debt_cents, started_at, ends_at)
  values (
    v_ad.id,
    v_ad.owner_id,
    'wallet_cpc',
    0,
    now(),
    now() + interval '24 hours'
  );

  update public.business_ads
  set status = 'active'::public.ad_status,
      starts_at = now(),
      ends_at = now() + interval '24 hours',
      updated_at = now()
  where id = p_ad_id;

  return jsonb_build_object(
    'billing_mode', 'wallet_cpc',
    'ends_at', (now() + interval '24 hours')
  );
end;
$$;

-- Aktif reklamlar için geriye dönük etkileşim gönderisi
do $$
declare
  v_ad record;
begin
  for v_ad in
    select id
    from public.business_ads
    where status = 'active'
  loop
    perform public.ensure_business_ad_engagement_post(v_ad.id);
  end loop;
end;
$$;

grant execute on function public.ensure_business_ad_engagement_post(uuid) to authenticated;
