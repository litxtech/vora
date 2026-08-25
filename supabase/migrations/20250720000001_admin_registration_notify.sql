-- Admin: yeni kayıt / misafir anlık push + her gece 23:59 (Europe/Istanbul) günlük özet

create or replace function public.notify_admins_registration(
  p_title text,
  p_body text,
  p_kind text,
  p_data jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_count integer := 0;
  v_kind text := coalesce(nullif(trim(p_kind), ''), 'registration');
begin
  for v_admin in
    select id
    from public.profiles
    where role in ('moderator', 'admin', 'super_admin')
      and account_status = 'active'
  loop
    insert into public.notification_outbox (recipient_id, event_type, title, body, data)
    values (
      v_admin.id,
      'system'::public.notification_event_type,
      p_title,
      left(p_body, 500),
      p_data || jsonb_build_object('admin_alert', true, 'kind', v_kind)
    );

    insert into public.notifications (user_id, event_type, title, body, data, category, priority)
    values (
      v_admin.id,
      'system'::public.notification_event_type,
      p_title,
      left(p_body, 500),
      p_data || jsonb_build_object('admin_alert', true, 'kind', v_kind),
      'system'::public.notification_category,
      'high'::public.notification_priority
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.create_user_profile_from_auth(p_user auth.users)
returns void
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  base_username text;
  final_username text;
  meta_birth_date date;
  meta_policy_consents jsonb;
  meta_is_guest boolean;
  meta_onboarding_completed boolean;
  meta_first_name text;
  meta_last_name text;
  meta_full_name text;
  meta_gender public.gender_type;
  meta_account_type public.account_type;
  v_account_label text;
begin
  if exists (select 1 from public.profiles where id = p_user.id) then
    return;
  end if;

  base_username := coalesce(
    nullif(trim(p_user.raw_user_meta_data->>'username'), ''),
    split_part(p_user.email, '@', 1)
  );
  final_username := lower(regexp_replace(trim(base_username), '[^a-zA-Z0-9_.-]', '', 'g'));

  if char_length(final_username) < 4 then
    final_username := final_username || '_' || substr(md5(random()::text), 1, 4);
  end if;

  while exists (select 1 from public.profiles where username = final_username) loop
    final_username := lower(regexp_replace(trim(base_username), '[^a-zA-Z0-9_.-]', '', 'g'))
      || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  if p_user.raw_user_meta_data->>'birth_date' is not null then
    meta_birth_date := (p_user.raw_user_meta_data->>'birth_date')::date;
  end if;

  meta_policy_consents := coalesce(p_user.raw_user_meta_data->'policy_consents', '{}'::jsonb);
  meta_is_guest := coalesce((p_user.raw_user_meta_data->>'is_guest')::boolean, false)
    or public.is_guest_auth_email(p_user.email);
  meta_onboarding_completed := meta_is_guest;
  meta_first_name := nullif(trim(p_user.raw_user_meta_data->>'first_name'), '');
  meta_last_name := nullif(trim(p_user.raw_user_meta_data->>'last_name'), '');
  meta_full_name := coalesce(
    nullif(trim(p_user.raw_user_meta_data->>'full_name'), ''),
    trim(concat_ws(' ', meta_first_name, meta_last_name))
  );

  if p_user.raw_user_meta_data->>'gender' is not null then
    meta_gender := (p_user.raw_user_meta_data->>'gender')::public.gender_type;
  end if;

  if p_user.raw_user_meta_data->>'account_type' is not null then
    meta_account_type := (p_user.raw_user_meta_data->>'account_type')::public.account_type;
  else
    meta_account_type := 'personal';
  end if;

  insert into public.profiles (
    id, username, full_name, first_name, last_name, birth_date,
    policy_consents, is_guest, gender, account_type, publisher_key, onboarding_completed
  )
  values (
    p_user.id,
    final_username,
    meta_full_name,
    meta_first_name,
    meta_last_name,
    meta_birth_date,
    meta_policy_consents,
    meta_is_guest,
    meta_gender,
    meta_account_type,
    public.generate_publisher_key(),
    meta_onboarding_completed
  );

  -- Admin push: kayıt / misafir (bildirim hatası profil oluşturmayı engellemez)
  begin
    if meta_is_guest then
      perform public.notify_admins_registration(
        'Yeni misafir hesap',
        format('@%s misafir olarak giriş yaptı.', final_username),
        'guest_created',
        jsonb_build_object(
          'user_id', p_user.id,
          'username', final_username,
          'is_guest', true,
          'account_type', meta_account_type::text
        )
      );
    else
      v_account_label := case meta_account_type::text
        when 'business' then 'işletme'
        else 'bireysel'
      end;
      perform public.notify_admins_registration(
        'Yeni kullanıcı kaydı',
        format('@%s (%s) kayıt oldu.', final_username, v_account_label),
        'new_registration',
        jsonb_build_object(
          'user_id', p_user.id,
          'username', final_username,
          'is_guest', false,
          'account_type', meta_account_type::text
        )
      );
    end if;
  exception
    when others then
      raise warning 'admin registration notify failed for %: %', p_user.id, sqlerrm;
  end;
end;
$$;

-- Günlük özet: Europe/Istanbul takvim günü (00:00–23:59)
create or replace function public.notify_admins_daily_registration_summary()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('Europe/Istanbul', now()))::date;
  v_total integer := 0;
  v_registered integer := 0;
  v_guests integer := 0;
  v_business integer := 0;
  v_personal integer := 0;
  v_body text;
begin
  select
    count(*)::int,
    count(*) filter (where coalesce(is_guest, false) = false)::int,
    count(*) filter (where coalesce(is_guest, false) = true)::int,
    count(*) filter (
      where coalesce(is_guest, false) = false
        and account_type = 'business'
    )::int,
    count(*) filter (
      where coalesce(is_guest, false) = false
        and account_type = 'personal'
    )::int
  into v_total, v_registered, v_guests, v_business, v_personal
  from public.profiles
  where (timezone('Europe/Istanbul', created_at))::date = v_today;

  v_body := format(
    'Bugün toplam %s profil: %s kayıt (%s bireysel, %s işletme), %s misafir.',
    v_total,
    v_registered,
    v_personal,
    v_business,
    v_guests
  );

  return public.notify_admins_registration(
    format('Günlük kayıt özeti · %s', to_char(v_today, 'DD.MM.YYYY')),
    v_body,
    'daily_registration_summary',
    jsonb_build_object(
      'date', v_today::text,
      'total', v_total,
      'registered', v_registered,
      'guests', v_guests,
      'business', v_business,
      'personal', v_personal
    )
  );
end;
$$;

revoke all on function public.notify_admins_registration(text, text, text, jsonb) from public;
revoke all on function public.notify_admins_daily_registration_summary() from public;
grant execute on function public.notify_admins_registration(text, text, text, jsonb) to service_role;
grant execute on function public.notify_admins_daily_registration_summary() to service_role;

do $$
begin
  create extension if not exists pg_cron with schema extensions;
exception
  when others then
    raise notice 'pg_cron extension kullanılamıyor: %', sqlerrm;
end;
$$;

-- 23:59 Europe/Istanbul = 20:59 UTC (TR UTC+3, yaz saati yok)
do $$
begin
  perform cron.unschedule('admin-daily-registration-summary');
exception
  when others then
    null;
end;
$$;

do $$
begin
  perform cron.schedule(
    'admin-daily-registration-summary',
    '59 20 * * *',
    $job$select public.notify_admins_daily_registration_summary()$job$
  );
exception
  when others then
    raise notice 'pg_cron kullanılamıyor; günlük kayıt özeti manuel: %', sqlerrm;
end;
$$;
