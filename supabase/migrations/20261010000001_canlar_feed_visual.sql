-- Liste kartları için mevcut bağış, kapak ve herkese açık gelişme sayısı.
-- Yeni tablo yok. Tıbbi yüzde üretilmez.

drop function if exists public.canlar_create_case(text, text, text, text, text, text, text, double precision, double precision, text);

create function public.canlar_create_case(
  p_species text,
  p_name text,
  p_traits text,
  p_summary text,
  p_city text,
  p_region text,
  p_urgency text,
  p_latitude double precision,
  p_longitude double precision,
  p_address_note text,
  p_cover text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_id uuid;
  v_name text := nullif(lower(trim(coalesce(p_name, ''))), '');
  v_city text := trim(p_city);
  v_hint uuid;
  v_status text := 'new_report';
  v_cover text := nullif(trim(coalesce(p_cover, '')), '');
begin
  v_uid := public.canlar_require_member(false);
  if v_name is not null and exists (
    select 1 from public.canlar_cases
    where reporter_id = v_uid
      and species = p_species
      and lower(coalesce(name, '')) = v_name
      and lower(city_label) = lower(v_city)
      and status not in ('completed', 'lost', 'cancelled', 'duplicate')
  ) then
    raise exception 'Bu hayvan için açık bir kurtarma dosyanız zaten var.';
  end if;
  select id into v_hint
  from public.canlar_cases
  where species = p_species
    and lower(city_label) = lower(v_city)
    and status not in ('completed', 'lost', 'cancelled', 'duplicate')
    and created_at > now() - interval '14 days'
  order by created_at desc
  limit 1;
  if v_hint is not null then
    v_status := 'awaiting_review';
  end if;
  if v_cover is not null and v_cover !~ '^https://' then
    raise exception 'Kapak görseli geçerli bir bağlantı olmalıdır.';
  end if;
  perform public.canlar_open_internal();
  insert into public.canlar_cases (
    public_code, species, name, traits, summary, city_label, region_id, urgency, status, reporter_id, duplicate_hint_id, cover_url
  ) values (
    'VC-' || lpad(nextval('public.canlar_public_code_seq')::text, 6, '0'),
    p_species, nullif(trim(coalesce(p_name, '')), ''), nullif(trim(coalesce(p_traits, '')), ''),
    trim(p_summary), v_city, nullif(p_region, ''), coalesce(p_urgency, 'normal'), v_status, v_uid, v_hint, v_cover
  ) returning id into v_id;
  insert into public.canlar_case_private (case_id, latitude, longitude, address_note)
  values (v_id, p_latitude, p_longitude, nullif(trim(coalesce(p_address_note, '')), ''));
  insert into public.canlar_case_events (case_id, from_status, to_status, note, is_public, actor_id)
  values (v_id, null, v_status, 'İhbar kaydı açıldı.', true, v_uid);
  perform public.canlar_audit(v_uid, 'case.create', 'case', v_id, null, null, v_status);
  return v_id;
end;
$$;

grant execute on function public.canlar_create_case(text, text, text, text, text, text, text, double precision, double precision, text, text) to anon, authenticated;

create or replace function public.canlar_home_feed()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  return jsonb_build_object(
    'featured', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select c.id, c.public_code, c.species, c.name, c.city_label, c.status, c.treatment_status, c.urgency,
               c.summary, c.cover_url, c.created_at, c.updated_at,
               (select count(*)::int from public.canlar_case_events e where e.case_id = c.id and e.is_public) as public_update_count,
               camp.id as campaign_id, camp.target_minor as campaign_target_minor, camp.currency as campaign_currency,
               camp.raised_minor as campaign_raised_minor
        from public.canlar_cases c
        left join lateral (
          select k.id, k.target_minor, k.currency,
            coalesce((
              select sum(d.gross_minor - d.refunded_minor)
              from public.canlar_donations d
              where d.campaign_id = k.id and d.status in ('succeeded', 'partially_refunded')
            ), 0) as raised_minor
          from public.canlar_campaigns k
          where k.case_id = c.id and k.status = 'live'
          order by k.created_at desc
          limit 1
        ) camp on true
        where c.status not in ('cancelled', 'duplicate', 'lost')
        order by case c.urgency when 'critical' then 0 when 'urgent' then 1 else 2 end, c.created_at desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'urgent', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select c.id, c.public_code, c.species, c.name, c.city_label, c.status, c.treatment_status, c.urgency,
               c.summary, c.cover_url, c.created_at, c.updated_at,
               (select count(*)::int from public.canlar_case_events e where e.case_id = c.id and e.is_public) as public_update_count
        from public.canlar_cases c
        where c.urgency in ('urgent', 'critical') and c.status not in ('completed', 'lost', 'cancelled', 'duplicate')
        order by c.created_at desc limit 8
      ) x
    ), '[]'::jsonb),
    'new_reports', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select id, public_code, species, name, city_label, status, treatment_status, urgency, summary, cover_url, created_at, updated_at
        from public.canlar_cases where status in ('new_report', 'awaiting_review')
        order by created_at desc limit 8
      ) x
    ), '[]'::jsonb),
    'in_treatment', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select c.id, c.public_code, c.species, c.name, c.city_label, c.status, c.treatment_status, c.urgency,
               c.summary, c.cover_url, c.created_at, c.updated_at,
               (select count(*)::int from public.canlar_case_events e where e.case_id = c.id and e.is_public) as public_update_count,
               (
                 select e.note from public.canlar_case_events e
                 where e.case_id = c.id and e.is_public and e.note is not null
                 order by e.created_at desc limit 1
               ) as latest_note
        from public.canlar_cases c
        where c.treatment_status in ('assessment', 'ongoing', 'recovery')
           or c.status in ('treatment', 'recovery', 'vet_assessment')
        order by c.updated_at desc limit 8
      ) x
    ), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select k.id, k.case_id, k.title, k.purpose, k.help_kind, k.status, k.payments_enabled, k.target_minor, k.currency, k.payout_model, k.created_at,
               c.cover_url, c.name as animal_name, c.city_label,
               coalesce((
                 select sum(d.gross_minor - d.refunded_minor)
                 from public.canlar_donations d
                 where d.campaign_id = k.id and d.status in ('succeeded', 'partially_refunded')
               ), 0) as raised_minor
        from public.canlar_campaigns k
        join public.canlar_cases c on c.id = k.case_id
        where k.status = 'live'
        order by k.created_at desc limit 8
      ) x
    ), '[]'::jsonb),
    'updates', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select e.id, e.case_id, e.to_status, e.note, e.created_at, c.public_code, c.name, c.city_label, c.cover_url, c.species, c.treatment_status
        from public.canlar_case_events e
        join public.canlar_cases c on c.id = e.case_id
        where e.is_public
        order by e.created_at desc limit 8
      ) x
    ), '[]'::jsonb),
    'resolved', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select id, public_code, species, name, city_label, status, treatment_status, outcome_note, summary, cover_url, created_at, updated_at
        from public.canlar_cases where status in ('completed', 'rehomed')
        order by closed_at desc nulls last limit 8
      ) x
    ), '[]'::jsonb),
    'aid_needs', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select k.id, k.case_id, k.title, k.help_kind, k.purpose, k.status, k.target_minor, k.currency, k.payments_enabled,
               c.cover_url, c.name as animal_name, c.city_label,
               coalesce((
                 select sum(d.gross_minor - d.refunded_minor)
                 from public.canlar_donations d
                 where d.campaign_id = k.id and d.status in ('succeeded', 'partially_refunded')
               ), 0) as raised_minor
        from public.canlar_campaigns k
        join public.canlar_cases c on c.id = k.case_id
        where k.status = 'live' and k.help_kind in ('food', 'medicine', 'transport', 'care')
        order by k.created_at desc limit 8
      ) x
    ), '[]'::jsonb),
    'completed_campaigns', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select k.id, k.case_id, k.title, k.purpose, k.help_kind, k.status, k.payments_enabled, k.target_minor, k.currency, k.created_at,
               c.cover_url, c.name as animal_name, c.city_label,
               coalesce((
                 select sum(d.gross_minor - d.refunded_minor)
                 from public.canlar_donations d
                 where d.campaign_id = k.id and d.status in ('succeeded', 'partially_refunded')
               ), 0) as raised_minor
        from public.canlar_campaigns k
        join public.canlar_cases c on c.id = k.case_id
        where k.status in ('goal_met', 'closed', 'report_pending')
        order by k.updated_at desc limit 8
      ) x
    ), '[]'::jsonb),
    'delivered_aid', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select a.id, a.aid_type, a.quantity_note, a.delivery_status, a.created_at, a.case_id,
               c.city_label, c.name, c.cover_url
        from public.canlar_aid a
        left join public.canlar_cases c on c.id = a.case_id
        where a.delivery_status = 'delivered'
        order by a.updated_at desc limit 8
      ) x
    ), '[]'::jsonb),
    'posts', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select p.id, p.body, p.city_label, p.species, p.urgency, p.like_count, p.comment_count,
               p.vora_post_id, p.case_id, p.campaign_id, p.created_at, p.media,
               pr.username as author_label
        from public.canlar_posts p
        left join public.profiles pr on pr.id = p.author_id
        where p.status = 'published'
        order by p.created_at desc
        limit 12
      ) x
    ), '[]'::jsonb),
    'followed', case when v_uid is null then '[]'::jsonb else coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select c.id, c.public_code, c.name, c.city_label, c.status, c.cover_url, c.species, e.to_status, e.created_at, e.note
        from public.canlar_follows f
        join public.canlar_cases c on c.id = f.case_id
        left join lateral (
          select to_status, created_at, note from public.canlar_case_events
          where case_id = c.id and is_public order by created_at desc limit 1
        ) e on true
        where f.user_id = v_uid
        order by e.created_at desc nulls last limit 8
      ) x
    ), '[]'::jsonb) end
  );
end;
$$;

create or replace function public.canlar_search(p_filters jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(coalesce((p_filters->>'limit')::integer, 20), 40);
  v_offset integer := greatest(coalesce((p_filters->>'offset')::integer, 0), 0);
  v_band text := p_filters->>'band';
begin
  return coalesce((
    select jsonb_agg(row_to_json(x)) from (
      select c.id, c.public_code, c.species, c.name, c.city_label, c.status, c.treatment_status, c.urgency,
             c.summary, c.cover_url, c.outcome_note, c.created_at, c.updated_at,
             (select count(*)::int from public.canlar_case_events e where e.case_id = c.id and e.is_public) as public_update_count,
             (
               select e.note from public.canlar_case_events e
               where e.case_id = c.id and e.is_public and e.note is not null
               order by e.created_at desc limit 1
             ) as latest_note
      from public.canlar_cases c
      where (p_filters->>'city' is null or lower(c.city_label) = lower(p_filters->>'city'))
        and (p_filters->>'species' is null or c.species = p_filters->>'species')
        and (p_filters->>'urgency' is null or c.urgency = p_filters->>'urgency')
        and (p_filters->>'status' is null or c.status = p_filters->>'status')
        and (p_filters->>'treatment' is null or c.treatment_status = p_filters->>'treatment')
        and (p_filters->>'query' is null or c.summary ilike '%' || (p_filters->>'query') || '%' or coalesce(c.name, '') ilike '%' || (p_filters->>'query') || '%')
        and c.status <> 'duplicate'
        and (
          v_band is null
          or (v_band = 'urgent' and c.urgency in ('urgent', 'critical') and c.status not in ('completed', 'lost', 'cancelled', 'duplicate'))
          or (v_band = 'new' and c.status in ('new_report', 'awaiting_review', 'verifying'))
          or (v_band = 'rescued' and c.status = 'rescued')
          or (v_band = 'treatment' and (c.status in ('treatment', 'vet_assessment') or c.treatment_status in ('ongoing', 'assessment')))
          or (v_band = 'recovery' and (c.status = 'recovery' or c.treatment_status = 'recovery'))
          or (v_band = 'healed' and (c.status = 'completed' or c.treatment_status = 'completed'))
          or (v_band = 'lost' and (c.status = 'lost' or c.treatment_status = 'lost'))
          or (v_band = 'rehome' and c.status = 'rehomed')
        )
      order by
        case when p_filters->>'sort' = 'urgent'
          then case c.urgency when 'critical' then 0 when 'urgent' then 1 else 2 end
          else 0 end,
        c.updated_at desc
      limit v_limit offset v_offset
    ) x
  ), '[]'::jsonb);
end;
$$;
