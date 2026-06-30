-- Premium abonelik canlı destek: thread + mesaj + bildirim + realtime

create table if not exists public.premium_support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null default 'Premium Abonelik Desteği'
    check (char_length(trim(subject)) between 3 and 200),
  topic text check (
    topic is null
    or topic in ('purchase', 'billing', 'renewal', 'cancel', 'features', 'restore', 'other')
  ),
  status text not null default 'open' check (
    status in ('open', 'waiting_user', 'waiting_support', 'resolved', 'closed')
  ),
  assigned_admin_id uuid references public.profiles (id) on delete set null,
  user_unread_count integer not null default 0 check (user_unread_count >= 0),
  support_unread_count integer not null default 0 check (support_unread_count >= 0),
  last_message_at timestamptz,
  last_message_preview text,
  subscription_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists premium_support_threads_user_idx
  on public.premium_support_threads (user_id);

create index if not exists premium_support_threads_status_idx
  on public.premium_support_threads (status, last_message_at desc nulls last);

create table if not exists public.premium_support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.premium_support_threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists premium_support_messages_thread_idx
  on public.premium_support_messages (thread_id, created_at asc);

alter table public.premium_support_threads enable row level security;
alter table public.premium_support_messages enable row level security;

create policy premium_support_threads_user_select on public.premium_support_threads
  for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());

create policy premium_support_messages_user_select on public.premium_support_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.premium_support_threads t
      where t.id = thread_id
        and (t.user_id = auth.uid() or public.is_moderator())
    )
  );

-- ─── Admin bildirimi ───────────────────────────────────────────────────────────

create or replace function public.notify_admins_premium_support(
  p_title text,
  p_body text,
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
      p_data || jsonb_build_object('admin_alert', true, 'kind', 'premium_support')
    );

    insert into public.notifications (user_id, event_type, title, body, data, category, priority)
    values (
      v_admin.id,
      'system'::public.notification_event_type,
      p_title,
      left(p_body, 500),
      p_data || jsonb_build_object('admin_alert', true, 'kind', 'premium_support'),
      'system'::public.notification_category,
      'high'::public.notification_priority
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ─── Mesaj sonrası thread güncelle + bildirim ────────────────────────────────

create or replace function public.on_premium_support_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread public.premium_support_threads%rowtype;
  v_sender_role text;
  v_preview text;
begin
  select * into v_thread
  from public.premium_support_threads
  where id = new.thread_id;

  if not found then
    return new;
  end if;

  select role into v_sender_role
  from public.profiles
  where id = new.sender_id;

  v_preview := left(trim(new.content), 120);

  if v_sender_role in ('moderator', 'admin', 'super_admin') then
    update public.premium_support_threads
    set
      status = case when status in ('resolved', 'closed') then 'waiting_user' else 'waiting_user' end,
      user_unread_count = user_unread_count + 1,
      support_unread_count = 0,
      assigned_admin_id = coalesce(assigned_admin_id, new.sender_id),
      last_message_at = new.created_at,
      last_message_preview = v_preview,
      updated_at = now(),
      resolved_at = null
  where id = new.thread_id;

    perform public.notify_user_system(
      v_thread.user_id,
      'Premium destek yanıtı',
      v_preview,
      jsonb_build_object(
        'kind', 'premium_support_message',
        'thread_id', new.thread_id,
        'message_id', new.id
      ),
      'high',
      new.sender_id
    );
  else
    update public.premium_support_threads
    set
      status = case when status in ('resolved', 'closed') then 'waiting_support' else 'waiting_support' end,
      support_unread_count = support_unread_count + 1,
      user_unread_count = 0,
      last_message_at = new.created_at,
      last_message_preview = v_preview,
      updated_at = now(),
      resolved_at = null
    where id = new.thread_id;

    perform public.notify_admins_premium_support(
      'Yeni premium destek mesajı',
      v_preview,
      jsonb_build_object(
        'kind', 'premium_support_message',
        'thread_id', new.thread_id,
        'message_id', new.id,
        'user_id', v_thread.user_id
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists premium_support_message_notify on public.premium_support_messages;
create trigger premium_support_message_notify
  after insert on public.premium_support_messages
  for each row execute function public.on_premium_support_message_insert();

-- ─── Kullanıcı: thread + ilk mesaj ───────────────────────────────────────────

create or replace function public.start_premium_support_thread(
  p_message text,
  p_topic text default null,
  p_subject text default 'Premium Abonelik Desteği'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_thread_id uuid;
  v_snapshot jsonb;
  v_sub record;
begin
  if v_user_id is null then
    raise exception 'Oturum bulunamadı';
  end if;

  if char_length(trim(p_message)) < 2 then
    raise exception 'Mesaj en az 2 karakter olmalıdır';
  end if;

  if p_topic is not null and p_topic not in (
    'purchase', 'billing', 'renewal', 'cancel', 'features', 'restore', 'other'
  ) then
    raise exception 'Geçersiz konu';
  end if;

  select
    ps.plan,
    ps.payment_provider,
    ps.status,
    ps.expires_at
  into v_sub
  from public.premium_subscriptions ps
  where ps.user_id = v_user_id
    and ps.status = 'active'
    and ps.expires_at > now()
  order by ps.expires_at desc
  limit 1;

  v_snapshot := jsonb_build_object(
    'is_premium', v_sub.plan is not null,
    'plan', v_sub.plan,
    'payment_provider', v_sub.payment_provider,
    'expires_at', v_sub.expires_at
  );

  select id into v_thread_id
  from public.premium_support_threads
  where user_id = v_user_id;

  if v_thread_id is null then
    insert into public.premium_support_threads (
      user_id, subject, topic, subscription_snapshot
    )
    values (
      v_user_id,
      trim(p_subject),
      p_topic,
      v_snapshot
    )
    returning id into v_thread_id;

    perform public.notify_admins_premium_support(
      'Yeni premium destek sohbeti',
      left(trim(p_message), 100),
      jsonb_build_object('kind', 'premium_support_started', 'thread_id', v_thread_id)
    );
  else
    update public.premium_support_threads
    set
      topic = coalesce(p_topic, topic),
      subject = case
        when status in ('resolved', 'closed') then trim(p_subject)
        else subject
      end,
      subscription_snapshot = v_snapshot,
      updated_at = now()
    where id = v_thread_id;
  end if;

  insert into public.premium_support_messages (thread_id, sender_id, content)
  values (v_thread_id, v_user_id, trim(p_message));

  perform public.notify_user_system(
    v_user_id,
    'Premium destek talebiniz alındı',
    'Destek ekibimiz en kısa sürede yanıt verecek. Bu ekrandan canlı takip edebilirsiniz.',
    jsonb_build_object('kind', 'premium_support_started', 'thread_id', v_thread_id),
    'normal'
  );

  return v_thread_id;
end;
$$;

-- ─── Mesaj gönder ────────────────────────────────────────────────────────────

create or replace function public.send_premium_support_message(
  p_thread_id uuid,
  p_content text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_thread public.premium_support_threads%rowtype;
  v_message_id uuid;
  v_is_staff boolean;
begin
  if v_user_id is null then
    raise exception 'Oturum bulunamadı';
  end if;

  if char_length(trim(p_content)) < 1 then
    raise exception 'Mesaj boş olamaz';
  end if;

  select * into v_thread
  from public.premium_support_threads
  where id = p_thread_id;

  if not found then
    raise exception 'Destek sohbeti bulunamadı';
  end if;

  v_is_staff := public.is_moderator();

  if not v_is_staff and v_thread.user_id <> v_user_id then
    raise exception 'Bu sohbete erişiminiz yok';
  end if;

  insert into public.premium_support_messages (thread_id, sender_id, content)
  values (p_thread_id, v_user_id, trim(p_content))
  returning id into v_message_id;

  return v_message_id;
end;
$$;

-- ─── Okundu işaretle ─────────────────────────────────────────────────────────

create or replace function public.mark_premium_support_read(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_thread public.premium_support_threads%rowtype;
begin
  if v_user_id is null then
    raise exception 'Oturum bulunamadı';
  end if;

  select * into v_thread
  from public.premium_support_threads
  where id = p_thread_id;

  if not found then
    return;
  end if;

  if public.is_moderator() then
    update public.premium_support_threads
    set support_unread_count = 0, updated_at = now()
    where id = p_thread_id;
  elsif v_thread.user_id = v_user_id then
    update public.premium_support_threads
    set user_unread_count = 0, updated_at = now()
    where id = p_thread_id;
  end if;
end;
$$;

-- ─── Admin listesi ───────────────────────────────────────────────────────────

create or replace function public.admin_list_premium_support_threads(
  p_status text default 'all',
  p_limit int default 50
)
returns table (
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  subject text,
  topic text,
  status text,
  user_unread_count int,
  support_unread_count int,
  last_message_at timestamptz,
  last_message_preview text,
  subscription_snapshot jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select
    t.id,
    t.user_id,
    p.username,
    p.full_name,
    t.subject,
    t.topic,
    t.status,
    t.user_unread_count,
    t.support_unread_count,
    t.last_message_at,
    t.last_message_preview,
    t.subscription_snapshot,
    t.created_at,
    t.updated_at
  from public.premium_support_threads t
  join public.profiles p on p.id = t.user_id
  where p_status = 'all' or t.status = p_status
  order by coalesce(t.last_message_at, t.created_at) desc
  limit greatest(1, least(p_limit, 100));
end;
$$;

create or replace function public.admin_update_premium_support_thread(
  p_thread_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread public.premium_support_threads%rowtype;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  if p_status not in ('open', 'waiting_user', 'waiting_support', 'resolved', 'closed') then
    raise exception 'Geçersiz durum';
  end if;

  select * into v_thread
  from public.premium_support_threads
  where id = p_thread_id;

  if not found then
    raise exception 'Sohbet bulunamadı';
  end if;

  update public.premium_support_threads
  set
    status = p_status,
    resolved_at = case when p_status in ('resolved', 'closed') then now() else null end,
    updated_at = now(),
    assigned_admin_id = coalesce(assigned_admin_id, auth.uid())
  where id = p_thread_id;

  perform public.notify_user_system(
    v_thread.user_id,
    'Premium destek durumu güncellendi',
    case p_status
      when 'resolved' then 'Destek talebiniz çözüldü olarak işaretlendi.'
      when 'closed' then 'Destek sohbetiniz kapatıldı.'
      when 'waiting_user' then 'Destek ekibi yanıtınızı bekliyor.'
      else 'Premium destek talebiniz güncellendi.'
    end,
    jsonb_build_object(
      'kind', 'premium_support_status',
      'thread_id', p_thread_id,
      'status', p_status
    ),
    'normal',
    auth.uid()
  );
end;
$$;

-- ─── Realtime ────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'premium_support_messages'
  ) then
    alter publication supabase_realtime add table public.premium_support_messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'premium_support_threads'
  ) then
    alter publication supabase_realtime add table public.premium_support_threads;
  end if;
end;
$$;

grant execute on function public.start_premium_support_thread(text, text, text) to authenticated;
grant execute on function public.send_premium_support_message(uuid, text) to authenticated;
grant execute on function public.mark_premium_support_read(uuid) to authenticated;
grant execute on function public.admin_list_premium_support_threads(text, int) to authenticated;
grant execute on function public.admin_update_premium_support_thread(uuid, text) to authenticated;
