-- Slug çakışmasında anlaşılır hata + güncelleme sırasında satır kontrolü

create or replace function public.admin_upsert_push_automation_template(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_slug text;
  v_trigger text;
  v_next_run timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  v_id := nullif(p_payload->>'id', '')::uuid;
  v_slug := lower(trim(coalesce(p_payload->>'slug', '')));
  v_trigger := coalesce(nullif(p_payload->>'trigger_type', ''), 'feed_activity');
  v_next_run := nullif(p_payload->>'next_run_at', '')::timestamptz;

  if v_slug = '' or v_slug !~ '^[a-z0-9][a-z0-9_-]{1,48}[a-z0-9]$' then
    raise exception 'Geçersiz slug (küçük harf, rakam, tire; 3-50 karakter)';
  end if;

  if exists (
    select 1
    from public.push_automation_templates t
    where t.slug = v_slug
      and (v_id is null or t.id <> v_id)
  ) then
    raise exception 'Bu slug zaten kullanılıyor: %. Farklı bir slug seçin.', v_slug;
  end if;

  if v_trigger = 'scheduled' then
    if v_next_run is null then
      raise exception 'Planlı gönderim için tarih ve saat seçmelisiniz.';
    end if;
    if v_next_run <= now() then
      raise exception 'Gönderim zamanı gelecekte olmalıdır.';
    end if;
  end if;

  if v_id is null then
    insert into public.push_automation_templates (
      name, slug, enabled, trigger_type, event_type, title, body, image_url, deep_link,
      region_ids, min_posts_in_window, activity_window_minutes,
      user_cooldown_hours, region_cooldown_minutes,
      interval_hours, interval_days, next_run_at, sort_order, pref_key, metadata,
      created_by, updated_by
    )
    values (
      trim(p_payload->>'name'),
      v_slug,
      coalesce((p_payload->>'enabled')::boolean, false),
      v_trigger,
      coalesce(nullif(p_payload->>'event_type', ''), 'feed_activity')::public.notification_event_type,
      trim(p_payload->>'title'),
      trim(p_payload->>'body'),
      nullif(trim(p_payload->>'image_url'), ''),
      coalesce(nullif(trim(p_payload->>'deep_link'), ''), '/(tabs)'),
      case
        when p_payload->'region_ids' is null or jsonb_typeof(p_payload->'region_ids') <> 'array'
          or jsonb_array_length(p_payload->'region_ids') = 0 then null
        else array(select jsonb_array_elements_text(p_payload->'region_ids'))
      end,
      coalesce((p_payload->>'min_posts_in_window')::int, 2),
      coalesce((p_payload->>'activity_window_minutes')::int, 30),
      coalesce((p_payload->>'user_cooldown_hours')::int, 90),
      coalesce((p_payload->>'region_cooldown_minutes')::int, 45),
      nullif(p_payload->>'interval_hours', '')::numeric,
      nullif(p_payload->>'interval_days', '')::numeric,
      v_next_run,
      coalesce((p_payload->>'sort_order')::int, 0),
      coalesce(nullif(p_payload->>'pref_key', ''), 'feed'),
      coalesce(p_payload->'metadata', '{}'::jsonb),
      auth.uid(),
      auth.uid()
    )
    returning id into v_id;
  else
    update public.push_automation_templates
    set
      name = trim(p_payload->>'name'),
      slug = v_slug,
      enabled = coalesce((p_payload->>'enabled')::boolean, enabled),
      trigger_type = v_trigger,
      event_type = coalesce(nullif(p_payload->>'event_type', ''), event_type::text)::public.notification_event_type,
      title = trim(p_payload->>'title'),
      body = trim(p_payload->>'body'),
      image_url = case
        when p_payload ? 'image_url' then nullif(trim(p_payload->>'image_url'), '')
        else image_url
      end,
      deep_link = coalesce(nullif(trim(p_payload->>'deep_link'), ''), deep_link),
      region_ids = case
        when p_payload->'region_ids' is null or jsonb_typeof(p_payload->'region_ids') <> 'array'
          or jsonb_array_length(p_payload->'region_ids') = 0 then null
        else array(select jsonb_array_elements_text(p_payload->'region_ids'))
      end,
      min_posts_in_window = coalesce((p_payload->>'min_posts_in_window')::int, min_posts_in_window),
      activity_window_minutes = coalesce((p_payload->>'activity_window_minutes')::int, activity_window_minutes),
      user_cooldown_hours = coalesce((p_payload->>'user_cooldown_hours')::int, user_cooldown_hours),
      region_cooldown_minutes = coalesce((p_payload->>'region_cooldown_minutes')::int, region_cooldown_minutes),
      interval_hours = coalesce(nullif(p_payload->>'interval_hours', '')::numeric, interval_hours),
      interval_days = coalesce(nullif(p_payload->>'interval_days', '')::numeric, interval_days),
      next_run_at = case
        when v_trigger = 'scheduled' then v_next_run
        when p_payload ? 'next_run_at' then nullif(p_payload->>'next_run_at', '')::timestamptz
        else next_run_at
      end,
      sort_order = coalesce((p_payload->>'sort_order')::int, sort_order),
      pref_key = coalesce(nullif(p_payload->>'pref_key', ''), pref_key),
      metadata = coalesce(p_payload->'metadata', metadata),
      updated_by = auth.uid()
    where id = v_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Şablon bulunamadı veya güncellenemedi.';
    end if;
  end if;

  return v_id;
end;
$$;
