-- Sahip silmesi, ihbar geri çekme ve Vora yorum sayaçlarının akışa yansıması.

create or replace function public.canlar_delete_post(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_post public.canlar_posts%rowtype;
begin
  v_uid := public.canlar_require_member(false);
  select * into v_post from public.canlar_posts where id = p_id;
  if not found then
    raise exception 'Gönderi bulunamadı.';
  end if;
  if v_post.author_id is distinct from v_uid and not public.is_moderator() then
    raise exception 'Bu paylaşımı silme yetkiniz yok.';
  end if;
  if v_post.status = 'removed' then
    return;
  end if;
  update public.canlar_posts
    set status = 'removed', updated_at = now()
    where id = p_id;
  if v_post.vora_post_id is not null then
    update public.posts
      set status = 'removed'
      where id = v_post.vora_post_id
        and (author_id = v_post.author_id or public.is_moderator());
  end if;
  perform public.canlar_audit(v_uid, 'post.delete', 'post', p_id, null, v_post.status, 'removed');
end;
$$;

create or replace function public.canlar_withdraw_case(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_case public.canlar_cases%rowtype;
begin
  v_uid := public.canlar_require_member(false);
  select * into v_case from public.canlar_cases where id = p_id;
  if not found then
    raise exception 'Kurtarma dosyası bulunamadı.';
  end if;
  if v_uid is distinct from v_case.reporter_id and not public.is_moderator() then
    raise exception 'Bu ihbarı silme yetkiniz yok.';
  end if;
  if v_case.status = 'cancelled' then
    return;
  end if;
  if v_case.status in ('completed', 'rehomed', 'lost') then
    raise exception 'Sonuçlanmış dosya silinemez.';
  end if;
  if exists (
    select 1
    from public.canlar_donations d
    join public.canlar_campaigns k on k.id = d.campaign_id
    where k.case_id = p_id and d.status <> 'failed'
  ) then
    raise exception 'Bu ihbarda bağış kaydı var. Kayıt silinemez.';
  end if;
  perform public.canlar_open_internal();
  update public.canlar_cases
    set status = 'cancelled',
        treatment_status = 'not_needed',
        outcome_note = 'İhbar sahibi kaydı geri çekti.',
        closed_at = now()
    where id = p_id;
  insert into public.canlar_case_events (case_id, from_status, to_status, note, is_public, actor_id)
  values (p_id, v_case.status, 'cancelled', 'İhbar sahibi kaydı geri çekti.', true, v_uid);
  perform public.canlar_audit(v_uid, 'case.withdraw', 'case', p_id, null, v_case.status, 'cancelled');
end;
$$;

revoke all on function public.canlar_delete_post(uuid) from public, anon;
grant execute on function public.canlar_delete_post(uuid) to authenticated;
revoke all on function public.canlar_withdraw_case(uuid) from public, anon;
grant execute on function public.canlar_withdraw_case(uuid) to authenticated;

create or replace function public.canlar_post_detail(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_post public.canlar_posts%rowtype;
  v_uid uuid := auth.uid();
  v_likes integer;
  v_comments integer;
begin
  select * into v_post from public.canlar_posts where id = p_id and (status = 'published' or author_id = v_uid or public.is_moderator());
  if not found then
    return null;
  end if;
  if v_post.vora_post_id is not null then
    select like_count, comment_count into v_likes, v_comments from public.posts where id = v_post.vora_post_id;
  else
    v_likes := v_post.like_count;
    v_comments := v_post.comment_count;
  end if;
  return jsonb_build_object(
    'post', jsonb_build_object(
      'id', v_post.id,
      'body', v_post.body,
      'media', v_post.media,
      'city_label', v_post.city_label,
      'species', v_post.species,
      'urgency', v_post.urgency,
      'case_id', v_post.case_id,
      'campaign_id', v_post.campaign_id,
      'vora_post_id', v_post.vora_post_id,
      'publish_mode', v_post.publish_mode,
      'like_count', coalesce(v_likes, 0),
      'comment_count', coalesce(v_comments, 0),
      'created_at', v_post.created_at,
      'author_id', v_post.author_id,
      'author_label', (select username from public.profiles where id = v_post.author_id)
    ),
    'can_delete', v_uid is not null and v_post.status <> 'removed' and (v_post.author_id = v_uid or public.is_moderator()),
    'liked', v_uid is not null and (
      (v_post.vora_post_id is not null and exists (
        select 1 from public.post_likes where post_id = v_post.vora_post_id and user_id = v_uid
      ))
      or exists (select 1 from public.canlar_post_likes where post_id = p_id and user_id = v_uid)
    ),
    'saved', v_uid is not null and (
      (v_post.vora_post_id is not null and exists (
        select 1 from public.post_saves where post_id = v_post.vora_post_id and user_id = v_uid
      ))
      or exists (select 1 from public.canlar_post_saves where post_id = p_id and user_id = v_uid)
    ),
    'comments', case when v_post.vora_post_id is null then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'body', c.body,
        'created_at', c.created_at,
        'author_id', c.author_id,
        'author_label', pr.username
      ) order by c.created_at)
      from public.canlar_post_comments c
      left join public.profiles pr on pr.id = c.author_id
      where c.post_id = p_id
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

create or replace function public.canlar_case_detail(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_case public.canlar_cases%rowtype;
  v_private boolean := false;
begin
  select * into v_case from public.canlar_cases where id = p_id;
  if not found then
    return null;
  end if;
  v_private := public.is_moderator() or v_uid = v_case.reporter_id or v_uid = v_case.assignee_id or v_uid = v_case.vet_user_id;
  return jsonb_build_object(
    'case', jsonb_build_object(
      'id', v_case.id,
      'public_code', v_case.public_code,
      'species', v_case.species,
      'name', v_case.name,
      'traits', v_case.traits,
      'summary', v_case.summary,
      'city_label', v_case.city_label,
      'urgency', v_case.urgency,
      'status', v_case.status,
      'treatment_status', v_case.treatment_status,
      'outcome_note', v_case.outcome_note,
      'cover_url', v_case.cover_url,
      'duplicate_hint_id', case when v_private then v_case.duplicate_hint_id else null end,
      'reporter_label', case when v_case.show_reporter_name or v_private then (select username from public.profiles where id = v_case.reporter_id) else null end,
      'created_at', v_case.created_at
    ),
    'can_withdraw', (
      v_uid is not null
      and (v_uid = v_case.reporter_id or public.is_moderator())
      and v_case.status not in ('completed', 'rehomed', 'lost', 'cancelled')
      and not exists (
        select 1
        from public.canlar_donations d
        join public.canlar_campaigns k on k.id = d.campaign_id
        where k.case_id = p_id and d.status <> 'failed'
      )
    ),
    'location', case when v_private then (
      select jsonb_build_object('latitude', latitude, 'longitude', longitude, 'address_note', address_note)
      from public.canlar_case_private where case_id = p_id
    ) else null end,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'from_status', e.from_status, 'to_status', e.to_status,
        'note', e.note, 'created_at', e.created_at, 'corrects_event_id', e.corrects_event_id
      ) order by e.created_at)
      from public.canlar_case_events e
      where e.case_id = p_id and (e.is_public or v_private)
    ), '[]'::jsonb),
    'progress_percent', null
  );
end;
$$;

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
        where (
          c.treatment_status in ('assessment', 'ongoing', 'recovery')
          or c.status in ('treatment', 'recovery', 'vet_assessment')
        )
          and c.status not in ('cancelled', 'duplicate', 'lost', 'completed')
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
        select p.id, p.body, p.city_label, p.species, p.urgency,
               case when p.vora_post_id is not null then coalesce(vp.like_count, p.like_count) else p.like_count end as like_count,
               case when p.vora_post_id is not null then coalesce(vp.comment_count, p.comment_count) else p.comment_count end as comment_count,
               p.vora_post_id, p.case_id, p.campaign_id, p.created_at, p.media,
               pr.username as author_label
        from public.canlar_posts p
        left join public.profiles pr on pr.id = p.author_id
        left join public.posts vp on vp.id = p.vora_post_id
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
        and c.status not in ('duplicate', 'cancelled')
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
