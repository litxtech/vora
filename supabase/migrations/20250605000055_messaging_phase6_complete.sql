-- BÖLÜM 57 Faz 6: Kart paylaşımı, gizlilik, bildirim gizleme, premium limitler

alter table public.messages
  add column if not exists metadata jsonb;

alter table public.profiles
  add column if not exists messaging_prefs jsonb not null default jsonb_build_object(
    'who_can_message', 'everyone',
    'who_can_call', 'everyone',
    'hide_notification_preview', false
  );

create table if not exists public.message_daily_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  usage_date date not null default current_date,
  message_count int not null default 0,
  primary key (user_id, usage_date)
);

-- Yeni mesaj tipleri
do $$ begin
  alter type public.message_type add value if not exists 'shared_post';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.message_type add value if not exists 'shared_reel';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.message_type add value if not exists 'shared_profile';
exception when duplicate_object then null;
end $$;

-- Arkadaşlık kontrolü
create or replace function public.are_friends(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.friend_requests fr
    where fr.status = 'accepted'
      and (
        (fr.sender_id = p_user_a and fr.receiver_id = p_user_b)
        or (fr.sender_id = p_user_b and fr.receiver_id = p_user_a)
      )
  );
$$;

create or replace function public.can_user_message_me(p_recipient_id uuid, p_sender_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_pref text;
begin
  if p_recipient_id = p_sender_id then
    return false;
  end if;

  select coalesce(p.messaging_prefs->>'who_can_message', 'everyone')
  into v_pref
  from public.profiles p
  where p.id = p_recipient_id;

  if v_pref = 'nobody' then
    return false;
  end if;

  if v_pref = 'friends' then
    return public.are_friends(p_recipient_id, p_sender_id);
  end if;

  return true;
end;
$$;

create or replace function public.can_user_call_me(p_recipient_id uuid, p_sender_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_pref text;
begin
  if p_recipient_id = p_sender_id then
    return false;
  end if;

  select coalesce(p.messaging_prefs->>'who_can_call', 'everyone')
  into v_pref
  from public.profiles p
  where p.id = p_recipient_id;

  if v_pref = 'nobody' then
    return false;
  end if;

  if v_pref = 'friends' then
    return public.are_friends(p_recipient_id, p_sender_id);
  end if;

  return true;
end;
$$;

-- DM oluşturma: gizlilik kontrolü
create or replace function public.get_or_create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'Giriş yapmanız gerekiyor';
  end if;

  if p_other_user_id = v_user_id then
    raise exception 'Kendinizle sohbet başlatamazsınız';
  end if;

  if exists (
    select 1 from public.user_blocks
    where (blocker_id = v_user_id and blocked_id = p_other_user_id)
       or (blocker_id = p_other_user_id and blocked_id = v_user_id)
  ) then
    raise exception 'Bu kullanıcıyla mesajlaşamazsınız';
  end if;

  select c.id into v_conversation_id
  from public.conversations c
  where c.type = 'direct'
    and (select count(*) from public.conversation_members cm where cm.conversation_id = c.id) = 2
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = c.id and cm.user_id = v_user_id
    )
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = c.id and cm.user_id = p_other_user_id
    )
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  if not public.can_user_message_me(p_other_user_id, v_user_id) then
    raise exception 'Bu kullanıcı mesaj almıyor';
  end if;

  insert into public.conversations (type, created_by)
  values ('direct', v_user_id)
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values
    (v_conversation_id, v_user_id),
    (v_conversation_id, p_other_user_id);

  return v_conversation_id;
end;
$$;

-- Günlük mesaj limiti (ücretsiz: 200, premium: sınırsız)
create or replace function public.enforce_message_daily_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_premium boolean;
  v_count int;
  v_limit int := 200;
begin
  select coalesce(p.is_premium, false) into v_premium
  from public.profiles p
  where p.id = new.sender_id;

  if v_premium then
    return new;
  end if;

  insert into public.message_daily_usage (user_id, usage_date, message_count)
  values (new.sender_id, current_date, 1)
  on conflict (user_id, usage_date)
  do update set message_count = public.message_daily_usage.message_count + 1
  returning message_count into v_count;

  if v_count > v_limit then
    raise exception 'Günlük mesaj limitine ulaştınız. Premium ile sınırsız mesaj gönderin.';
  end if;

  return new;
end;
$$;

drop trigger if exists messages_daily_limit on public.messages;
create trigger messages_daily_limit
  before insert on public.messages
  for each row execute function public.enforce_message_daily_limit();

-- Premium: daha fazla sabitleme (ücretsiz 5, premium 20)
create or replace function public.pin_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_limit integer;
  v_premium boolean;
begin
  select coalesce(p.is_premium, false) into v_premium
  from public.profiles p where p.id = auth.uid();

  v_limit := case when v_premium then 20 else 5 end;

  select count(*) into v_count
  from public.conversation_members
  where user_id = auth.uid() and is_pinned = true;

  if v_count >= v_limit then
    raise exception 'Sabitleme limitine ulaştınız';
  end if;

  update public.conversation_members
  set is_pinned = true, pinned_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();

  return found;
end;
$$;

-- Bildirim önizlemesi gizleme
create or replace function public.notify_message_recipients()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  preview text;
  v_conv_type public.conversation_type;
  v_conv_title text;
  v_event public.notification_event_type;
  v_hide_preview boolean;
begin
  select coalesce(p.full_name, '@' || p.username)
  into sender_name
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
    case when v_conv_type = 'group' then coalesce(v_conv_title, 'Grup mesajı') else coalesce(sender_name, 'Yeni mesaj') end,
    case
      when coalesce((p.messaging_prefs->>'hide_notification_preview')::boolean, false) then 'Yeni mesaj'
      when v_conv_type = 'group' then coalesce(sender_name, 'Birisi') || ': ' || preview
      else preview
    end,
    jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id, 'is_group', v_conv_type = 'group'),
    new.sender_id
  from public.conversation_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
    and (cm.muted_until is null or cm.muted_until < now());

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  select
    cm.user_id,
    v_event,
    case when v_conv_type = 'group' then coalesce(v_conv_title, 'Grup mesajı') else coalesce(sender_name, 'Yeni mesaj') end,
    case
      when coalesce((p.messaging_prefs->>'hide_notification_preview')::boolean, false) then 'Yeni mesaj'
      when v_conv_type = 'group' then coalesce(sender_name, 'Birisi') || ': ' || preview
      else preview
    end,
    jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id, 'is_group', v_conv_type = 'group'),
    new.sender_id
  from public.conversation_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
    and (cm.muted_until is null or cm.muted_until < now());

  return new;
end;
$$;

-- Kalan günlük mesaj hakkı
create or replace function public.get_message_daily_remaining()
returns int
language sql
security definer
set search_path = public
stable
as $$
  select case
    when coalesce(p.is_premium, false) then -1
    else greatest(0, 200 - coalesce(u.message_count, 0))
  end
  from public.profiles p
  left join public.message_daily_usage u
    on u.user_id = p.id and u.usage_date = current_date
  where p.id = auth.uid();
$$;
