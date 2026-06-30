-- Hesap bağlama: hedef hesaptan tek seferlik onay

alter type public.notification_event_type add value if not exists 'account_link_request';
alter type public.notification_event_type add value if not exists 'account_link_accepted';
alter type public.notification_event_type add value if not exists 'account_link_declined';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_link_request_status') then
    create type public.account_link_request_status as enum ('pending', 'accepted', 'declined', 'cancelled');
  end if;
end $$;

create table if not exists public.account_link_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  target_user_id uuid not null references public.profiles (id) on delete cascade,
  status public.account_link_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  constraint account_link_requests_distinct_users check (requester_id <> target_user_id)
);

create unique index if not exists account_link_requests_pending_pair_idx
  on public.account_link_requests (requester_id, target_user_id)
  where status = 'pending';

create index if not exists account_link_requests_target_pending_idx
  on public.account_link_requests (target_user_id)
  where status = 'pending';

alter table public.account_link_requests enable row level security;

drop policy if exists "account_link_requests_participant_select" on public.account_link_requests;
create policy "account_link_requests_participant_select" on public.account_link_requests
  for select
  to authenticated
  using (auth.uid() in (requester_id, target_user_id));

create or replace function public.notify_account_link_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester_name text;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  select coalesce(p.full_name, '@' || p.username)
  into v_requester_name
  from public.profiles p
  where p.id = new.requester_id;

  insert into public.notifications (user_id, event_type, title, body, actor_id, data, category)
  values (
    new.target_user_id,
    'account_link_request'::public.notification_event_type,
    'Hesap bağlama isteği',
    coalesce(v_requester_name, 'Bir kullanıcı')
      || ' hesabını sizinle bağlamak istiyor. Tek seferlik onay verin.',
    new.requester_id,
    jsonb_build_object(
      'request_id', new.id,
      'requester_id', new.requester_id,
      'actor_id', new.requester_id
    ),
    'system'::public.notification_category
  );

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (
    new.target_user_id,
    'account_link_request'::public.notification_event_type,
    'Hesap bağlama isteği',
    coalesce(v_requester_name, 'Bir kullanıcı')
      || ' hesabını sizinle bağlamak istiyor.',
    jsonb_build_object('request_id', new.id, 'requester_id', new.requester_id, 'actor_id', new.requester_id),
    new.requester_id
  );

  return new;
end;
$$;

drop trigger if exists account_link_request_notify on public.account_link_requests;
create trigger account_link_request_notify
  after insert on public.account_link_requests
  for each row
  execute function public.notify_account_link_request();

create or replace function public.request_account_link(p_target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_self_type public.account_type;
  v_target_type public.account_type;
  v_request_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_target_user_id = v_uid then
    raise exception 'cannot link self';
  end if;

  select account_type into v_self_type from public.profiles where id = v_uid;
  select account_type into v_target_type from public.profiles where id = p_target_user_id;

  if v_self_type is null or v_target_type is null then
    raise exception 'profile not found';
  end if;

  if v_self_type = v_target_type then
    raise exception 'account types must differ';
  end if;

  if exists (
    select 1 from public.linked_accounts la
    where la.personal_user_id in (v_uid, p_target_user_id)
       or la.business_user_id in (v_uid, p_target_user_id)
  ) then
    raise exception 'link already exists';
  end if;

  if exists (
    select 1 from public.account_link_requests r
    where r.status = 'pending'
      and r.expires_at > now()
      and (
        (r.requester_id = v_uid and r.target_user_id = p_target_user_id)
        or (r.requester_id = p_target_user_id and r.target_user_id = v_uid)
      )
  ) then
    raise exception 'pending request exists';
  end if;

  insert into public.account_link_requests (requester_id, target_user_id)
  values (v_uid, p_target_user_id)
  returning id into v_request_id;

  return v_request_id;
end;
$$;

create or replace function public.respond_account_link_request(
  p_request_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.account_link_requests%rowtype;
  v_requester_name text;
  v_target_name text;
  v_title text;
  v_body text;
  v_event public.notification_event_type;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_req
  from public.account_link_requests
  where id = p_request_id
    and target_user_id = v_uid
    and status = 'pending'
  for update;

  if not found then
    raise exception 'request not found';
  end if;

  if v_req.expires_at < now() then
    update public.account_link_requests
    set status = 'cancelled', responded_at = now()
    where id = p_request_id;
    raise exception 'request expired';
  end if;

  if p_accept then
    perform public.create_account_link(v_req.requester_id);
    update public.account_link_requests
    set status = 'accepted', responded_at = now()
    where id = p_request_id;

    select coalesce(full_name, '@' || username) into v_target_name
    from public.profiles where id = v_uid;

    v_event := 'account_link_accepted';
    v_title := 'Hesap bağlandı';
    v_body := coalesce(v_target_name, 'Hesap') || ' bağlama isteğinizi onayladı.';
  else
    update public.account_link_requests
    set status = 'declined', responded_at = now()
    where id = p_request_id;

    select coalesce(full_name, '@' || username) into v_target_name
    from public.profiles where id = v_uid;

    v_event := 'account_link_declined';
    v_title := 'Hesap bağlama reddedildi';
    v_body := coalesce(v_target_name, 'Hesap') || ' bağlama isteğinizi reddetti.';
  end if;

  insert into public.notifications (user_id, event_type, title, body, actor_id, data, category)
  values (
    v_req.requester_id,
    v_event,
    v_title,
    v_body,
    v_uid,
    jsonb_build_object('request_id', p_request_id, 'actor_id', v_uid),
    'system'::public.notification_category
  );

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (
    v_req.requester_id,
    v_event,
    v_title,
    v_body,
    jsonb_build_object('request_id', p_request_id, 'actor_id', v_uid),
    v_uid
  );
end;
$$;

revoke all on function public.request_account_link(uuid) from public;
grant execute on function public.request_account_link(uuid) to authenticated;

revoke all on function public.respond_account_link_request(uuid, boolean) from public;
grant execute on function public.respond_account_link_request(uuid, boolean) to authenticated;
