-- İlan bağışı: hedef tutar zorunlu değil. Durum seçilince ilan kalır, bağış kapanır.

alter table public.canlar_posts
  add column if not exists donation_open boolean not null default false,
  add column if not exists outcome text;

alter table public.canlar_posts
  drop constraint if exists canlar_posts_outcome;

alter table public.canlar_posts
  add constraint canlar_posts_outcome check (outcome is null or outcome in ('treating', 'recovered', 'lost'));

alter table public.canlar_campaigns drop constraint if exists canlar_campaigns_target;
alter table public.canlar_campaigns
  add constraint canlar_campaigns_target check (target_minor >= 0);

create or replace function public.canlar_open_listing_donation(p_post_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.canlar_require_member(false);
  v_post public.canlar_posts%rowtype;
  v_case uuid;
  v_campaign uuid;
  v_city text;
  v_summary text;
begin
  select * into v_post from public.canlar_posts where id = p_post_id;
  if not found or v_post.status <> 'published' then
    raise exception 'İlan bulunamadı.';
  end if;
  if v_post.author_id <> v_uid and not public.is_moderator() then
    raise exception 'Bu ilana bağış butonu ekleme yetkiniz yok.';
  end if;
  if v_post.outcome is not null then
    raise exception 'Bu ilanın bağışı kapanmış.';
  end if;
  if v_post.campaign_id is not null then
    perform public.canlar_open_internal();
    update public.canlar_campaigns
      set status = 'live', payments_enabled = true
      where id = v_post.campaign_id;
    update public.canlar_posts set donation_open = true where id = p_post_id;
    return v_post.campaign_id;
  end if;

  v_city := coalesce(nullif(trim(coalesce(v_post.city_label, '')), ''), 'Belirtilmedi');
  v_summary := trim(v_post.body);
  if char_length(v_summary) < 8 then
    v_summary := rpad(v_summary, 8, '.');
  end if;

  perform public.canlar_open_internal();
  v_case := v_post.case_id;
  if v_case is null then
    insert into public.canlar_cases (
      public_code, species, summary, city_label, urgency, status, treatment_status, reporter_id, cover_url
    ) values (
      'VC-' || lpad(nextval('public.canlar_public_code_seq')::text, 6, '0'),
      'other',
      v_summary,
      v_city,
      'normal',
      'new_report',
      'unknown',
      v_uid,
      nullif(v_post.media #>> '{0,url}', '')
    ) returning id into v_case;
    insert into public.canlar_case_private (case_id) values (v_case);
    insert into public.canlar_case_events (case_id, from_status, to_status, note, is_public, actor_id)
    values (v_case, null, 'new_report', 'Bağışlı ilan açıldı.', true, v_uid);
  end if;

  insert into public.canlar_campaigns (
    case_id, owner_id, title, purpose, help_kind, payout_model, target_minor, currency,
    fulfillment_plan, proof_plan, budget_gap_note, status, payments_enabled
  ) values (
    v_case,
    v_uid,
    left(v_summary, 80),
    v_summary,
    'treatment',
    'beneficiary',
    0,
    'try',
    'Hedef tutar yok. Gelen bağış ilanda görünür.',
    'Toplanan tutar ilanda anlık görünür.',
    'Açık bağış. Sabit hedef yok.',
    'live',
    true
  ) returning id into v_campaign;

  update public.canlar_posts
    set case_id = v_case, campaign_id = v_campaign, donation_open = true
    where id = p_post_id;

  return v_campaign;
end;
$$;

create or replace function public.canlar_set_listing_outcome(p_post_id uuid, p_outcome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.canlar_require_member(false);
  v_post public.canlar_posts%rowtype;
  v_status text;
  v_treatment text;
  v_from text;
begin
  if p_outcome not in ('treating', 'recovered', 'lost') then
    raise exception 'Durum seçilemedi.';
  end if;
  select * into v_post from public.canlar_posts where id = p_post_id and status = 'published';
  if not found then
    raise exception 'İlan bulunamadı.';
  end if;
  if v_post.author_id <> v_uid and not public.is_moderator() then
    raise exception 'Bu ilanın durumunu güncelleme yetkiniz yok.';
  end if;

  v_status := case p_outcome when 'treating' then 'treatment' when 'recovered' then 'completed' else 'lost' end;
  v_treatment := case p_outcome when 'treating' then 'ongoing' when 'recovered' then 'completed' else 'lost' end;

  perform public.canlar_open_internal();
  update public.canlar_posts
    set outcome = p_outcome, donation_open = false
    where id = p_post_id;

  if v_post.campaign_id is not null then
    update public.canlar_campaigns
      set payments_enabled = false, status = 'closed'
      where id = v_post.campaign_id;
  end if;

  if v_post.case_id is not null then
    select status into v_from from public.canlar_cases where id = v_post.case_id;
    update public.canlar_cases
      set status = v_status, treatment_status = v_treatment
      where id = v_post.case_id;
    insert into public.canlar_case_events (case_id, from_status, to_status, note, is_public, actor_id)
    values (
      v_post.case_id,
      v_from,
      v_status,
      case p_outcome
        when 'treating' then 'Tedavi oldu. Bağış kapandı.'
        when 'recovered' then 'İyileşti. Bağış kapandı.'
        else 'Maalesef kaybettik. Bağış kapandı.'
      end,
      true,
      v_uid
    );
  end if;
end;
$$;

create or replace function public.canlar_listing_state(p_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'outcome', p.outcome,
    'donation_open', p.donation_open,
    'campaign_id', p.campaign_id,
    'author_id', p.author_id,
    'raised_minor', coalesce((
      select sum(d.gross_minor - d.refunded_minor)
      from public.canlar_donations d
      where d.campaign_id = p.campaign_id and d.status in ('succeeded', 'partially_refunded')
    ), 0)
  )), '[]'::jsonb)
  from public.canlar_posts p
  where p.id = any(p_ids) and p.status = 'published';
$$;

revoke all on function public.canlar_open_listing_donation(uuid) from public, anon;
grant execute on function public.canlar_open_listing_donation(uuid) to authenticated;
revoke all on function public.canlar_set_listing_outcome(uuid, text) from public, anon;
grant execute on function public.canlar_set_listing_outcome(uuid, text) to authenticated;
revoke all on function public.canlar_listing_state(uuid[]) from public, anon;
grant execute on function public.canlar_listing_state(uuid[]) to anon, authenticated;
