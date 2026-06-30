-- Personel Merkezi: paylaşım kartları, ilan kapama, profil eki, kayıtlı arama, sahip istatistikleri

alter type public.content_status add value if not exists 'filled';

alter type public.message_type add value if not exists 'shared_job_listing';
alter type public.message_type add value if not exists 'shared_staff_listing';

alter table public.job_applications
  add column if not exists applicant_profile_snapshot jsonb;

alter table public.staff_requests
  add column if not exists view_count integer not null default 0;

create table if not exists public.staff_request_views (
  request_id uuid not null references public.staff_requests (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, viewer_id)
);

alter table public.staff_request_views enable row level security;

drop policy if exists "staff_request_views_self_insert" on public.staff_request_views;
create policy "staff_request_views_self_insert" on public.staff_request_views
  for insert with check (auth.uid() = viewer_id);

drop policy if exists "staff_request_views_author_read" on public.staff_request_views;
create policy "staff_request_views_author_read" on public.staff_request_views
  for select using (
    auth.uid() = viewer_id
    or exists (
      select 1 from public.staff_requests sr
      where sr.id = staff_request_views.request_id and sr.author_id = auth.uid()
    )
  );

create table if not exists public.personnel_saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  region_id text references public.regions (id) on delete set null,
  label text not null default 'Kayıtlı arama',
  query_text text,
  district text,
  job_type public.job_type,
  housing_provided boolean,
  urgent_only boolean not null default false,
  listing_type text not null default 'both' check (listing_type in ('job', 'staff', 'both')),
  notify_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists personnel_saved_searches_user_idx
  on public.personnel_saved_searches (user_id, created_at desc);

alter table public.personnel_saved_searches enable row level security;

drop policy if exists "personnel_saved_searches_own" on public.personnel_saved_searches;
create policy "personnel_saved_searches_own" on public.personnel_saved_searches
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.increment_staff_view_count(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_inserted_id uuid;
begin
  if v_viewer_id is null then
    update public.staff_requests
    set view_count = view_count + 1
    where id = p_request_id and status = 'published';
    return true;
  end if;

  insert into public.staff_request_views (request_id, viewer_id)
  values (p_request_id, v_viewer_id)
  on conflict do nothing
  returning request_id into v_inserted_id;

  if v_inserted_id is not null then
    update public.staff_requests
    set view_count = view_count + 1
    where id = p_request_id and status = 'published';
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.increment_staff_view_count(uuid) to anon, authenticated;

create or replace function public.fill_own_job_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Giriş yapmanız gerekiyor.');
  end if;

  update public.job_listings
  set status = 'filled'
  where id = p_listing_id
    and author_id = auth.uid()
    and status = 'published';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return jsonb_build_object('error', 'İlan bulunamadı veya kapatılamadı.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.fill_own_job_listing(uuid) to authenticated;

create or replace function public.fill_own_staff_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Giriş yapmanız gerekiyor.');
  end if;

  update public.staff_requests
  set status = 'filled'
  where id = p_request_id
    and author_id = auth.uid()
    and status = 'published';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return jsonb_build_object('error', 'Talep bulunamadı veya kapatılamadı.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.fill_own_staff_request(uuid) to authenticated;

create or replace function public.remove_own_job_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Giriş yapmanız gerekiyor.');
  end if;

  update public.job_listings
  set status = 'removed'
  where id = p_listing_id
    and author_id = auth.uid()
    and status in ('published', 'draft', 'hidden', 'filled');

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return jsonb_build_object('error', 'İlan bulunamadı veya kaldırma yetkiniz yok.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.remove_own_staff_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Giriş yapmanız gerekiyor.');
  end if;

  update public.staff_requests
  set status = 'removed'
  where id = p_request_id
    and author_id = auth.uid()
    and status in ('published', 'draft', 'hidden', 'filled');

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return jsonb_build_object('error', 'Talep bulunamadı veya kaldırma yetkiniz yok.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.notify_applicants_listing_filled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app record;
  v_title text;
  v_body text;
begin
  if old.status = new.status or new.status <> 'filled' then
    return new;
  end if;

  v_title := case TG_TABLE_NAME
    when 'job_listings' then 'Pozisyon doldu'
    else 'Personel bulundu'
  end;

  v_body := coalesce(left(new.title, 80), 'İlan') || ' — artık başvuru kabul edilmiyor.';

  for v_app in
    select ja.id, ja.applicant_id
    from public.job_applications ja
    where ja.status in ('sent', 'reviewing', 'interview')
      and (
        (TG_TABLE_NAME = 'job_listings' and ja.job_id = new.id)
        or (TG_TABLE_NAME = 'staff_requests' and ja.staff_request_id = new.id)
      )
  loop
    insert into public.notification_outbox (recipient_id, event_type, title, body, data)
    values (
      v_app.applicant_id,
      'job'::public.notification_event_type,
      v_title,
      v_body,
      jsonb_build_object(
        'application_id', v_app.id,
        'job_id', case when TG_TABLE_NAME = 'job_listings' then new.id else null end,
        'staff_request_id', case when TG_TABLE_NAME = 'staff_requests' then new.id else null end,
        'listing_status', 'filled'
      )
    );

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      v_app.applicant_id,
      'job'::public.notification_event_type,
      v_title,
      v_body,
      jsonb_build_object(
        'application_id', v_app.id,
        'job_id', case when TG_TABLE_NAME = 'job_listings' then new.id else null end,
        'staff_request_id', case when TG_TABLE_NAME = 'staff_requests' then new.id else null end,
        'listing_status', 'filled'
      ),
      new.author_id
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists job_listing_filled_notify on public.job_listings;
create trigger job_listing_filled_notify
  after update of status on public.job_listings
  for each row execute function public.notify_applicants_listing_filled();

drop trigger if exists staff_request_filled_notify on public.staff_requests;
create trigger staff_request_filled_notify
  after update of status on public.staff_requests
  for each row execute function public.notify_applicants_listing_filled();

create or replace function public.notify_personnel_saved_search_matches()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_search record;
  v_listing_type text;
  v_title text;
begin
  if new.status <> 'published' then
    return new;
  end if;

  v_listing_type := case TG_TABLE_NAME
    when 'job_listings' then 'job'
    when 'staff_requests' then 'staff'
    else null
  end;

  v_title := case v_listing_type
    when 'job' then 'Yeni iş ilanı'
    else 'Yeni personel talebi'
  end;

  for v_search in
    select s.*
    from public.personnel_saved_searches s
    where s.notify_enabled = true
      and s.user_id <> new.author_id
      and (s.region_id is null or s.region_id = new.region_id)
      and (s.listing_type = 'both' or s.listing_type = v_listing_type)
      and (s.job_type is null or s.job_type = new.job_type)
      and (s.district is null or s.district = new.district)
      and (not s.urgent_only or coalesce(new.is_urgent, false) = true)
      and (
        s.query_text is null
        or btrim(s.query_text) = ''
        or new.title ilike '%' || s.query_text || '%'
        or new.description ilike '%' || s.query_text || '%'
        or coalesce(new.district, '') ilike '%' || s.query_text || '%'
      )
      and (
        s.housing_provided is null
        or coalesce(new.housing_provided, false) = s.housing_provided
      )
  loop
    insert into public.notification_outbox (recipient_id, event_type, title, body, data)
    values (
      v_search.user_id,
      'job'::public.notification_event_type,
      v_title,
      coalesce(left(new.title, 80), 'Kayıtlı aramanıza uygun yeni ilan'),
      jsonb_build_object(
        'job_id', case when v_listing_type = 'job' then new.id else null end,
        'staff_request_id', case when v_listing_type = 'staff' then new.id else null end,
        'saved_search_id', v_search.id
      )
    );

    insert into public.notifications (user_id, event_type, title, body, data)
    values (
      v_search.user_id,
      'job'::public.notification_event_type,
      v_title,
      coalesce(left(new.title, 80), 'Kayıtlı aramanıza uygun yeni ilan'),
      jsonb_build_object(
        'job_id', case when v_listing_type = 'job' then new.id else null end,
        'staff_request_id', case when v_listing_type = 'staff' then new.id else null end,
        'saved_search_id', v_search.id
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists job_listing_saved_search_notify on public.job_listings;
create trigger job_listing_saved_search_notify
  after insert on public.job_listings
  for each row execute function public.notify_personnel_saved_search_matches();

drop trigger if exists staff_request_saved_search_notify on public.staff_requests;
create trigger staff_request_saved_search_notify
  after insert on public.staff_requests
  for each row execute function public.notify_personnel_saved_search_matches();

create or replace function public.get_personnel_listing_owner_stats(
  p_listing_type text,
  p_listing_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_view_count int := 0;
  v_views_7d int := 0;
  v_apps_total int := 0;
  v_apps_pending int := 0;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Giriş yapmanız gerekiyor.');
  end if;

  if p_listing_type = 'job' then
    select jl.author_id, coalesce(jl.view_count, 0)
    into v_author_id, v_view_count
    from public.job_listings jl
    where jl.id = p_listing_id;

    if v_author_id is null or v_author_id <> auth.uid() then
      return jsonb_build_object('error', 'Yetkiniz yok.');
    end if;

    select count(*)::int into v_views_7d
    from public.job_listing_views jlv
    where jlv.listing_id = p_listing_id
      and jlv.created_at >= now() - interval '7 days';

    select count(*)::int,
      count(*) filter (where ja.status in ('sent', 'reviewing', 'interview'))::int
    into v_apps_total, v_apps_pending
    from public.job_applications ja
    where ja.job_id = p_listing_id;
  elsif p_listing_type = 'staff' then
    select sr.author_id, coalesce(sr.view_count, 0)
    into v_author_id, v_view_count
    from public.staff_requests sr
    where sr.id = p_listing_id;

    if v_author_id is null or v_author_id <> auth.uid() then
      return jsonb_build_object('error', 'Yetkiniz yok.');
    end if;

    select count(*)::int into v_views_7d
    from public.staff_request_views srv
    where srv.request_id = p_listing_id
      and srv.created_at >= now() - interval '7 days';

    select count(*)::int,
      count(*) filter (where ja.status in ('sent', 'reviewing', 'interview'))::int
    into v_apps_total, v_apps_pending
    from public.job_applications ja
    where ja.staff_request_id = p_listing_id;
  else
    return jsonb_build_object('error', 'Geçersiz ilan türü.');
  end if;

  return jsonb_build_object(
    'view_count', v_view_count,
    'views_last_7_days', v_views_7d,
    'applications_total', v_apps_total,
    'applications_pending', v_apps_pending
  );
end;
$$;

grant execute on function public.get_personnel_listing_owner_stats(text, uuid) to authenticated;

create or replace function public.notify_message_recipients()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  sender_avatar text;
  preview text;
  v_conv_type public.conversation_type;
  v_conv_title text;
  v_event public.notification_event_type;
begin
  if new.message_type = 'call' then
    return new;
  end if;

  select coalesce(p.full_name, '@' || p.username), p.avatar_url
  into sender_name, sender_avatar
  from public.profiles p
  where p.id = new.sender_id;

  select c.type, c.title
  into v_conv_type, v_conv_title
  from public.conversations c
  where c.id = new.conversation_id;

  preview := left(
    case new.message_type
      when 'image' then 'Fotoğraf gönderdi'
      when 'video' then 'Video gönderdi'
      when 'audio' then 'Ses kaydı gönderdi'
      when 'location' then 'Konum paylaştı'
      when 'file' then 'Dosya gönderdi'
      when 'shared_post' then 'Gönderi paylaştı'
      when 'shared_reel' then 'Reel paylaştı'
      when 'shared_profile' then 'Profil paylaştı'
      when 'shared_marketplace_listing' then 'İlan paylaştı'
      when 'shared_job_listing' then 'İş ilanı paylaştı'
      when 'shared_staff_listing' then 'Personel talebi paylaştı'
      else new.content
    end,
    180
  );

  v_event := case when v_conv_type = 'group' then 'group_message'::public.notification_event_type
                  else 'message'::public.notification_event_type end;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select
    cm.user_id,
    v_event,
    case when v_conv_type = 'group' then coalesce(v_conv_title, 'Grup') else sender_name end,
    preview,
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'message_id', new.id,
      'sender_avatar', sender_avatar
    ),
    new.sender_id
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
    and (cm.muted_until is null or cm.muted_until < now());

  return new;
end;
$$;
