-- Mesaj push iOS: outbox claim push gönderilmeden processed_at işaretlemesin;
-- takılı kayıtları temizle; rozet için mesaj okunmamış sayısı RPC.

alter table public.notification_outbox
  add column if not exists claimed_at timestamptz;

create index if not exists notification_outbox_claimable_idx
  on public.notification_outbox (created_at)
  where processed_at is null;

-- Claim: yalnızca claimed_at işaretle; processed_at başarılı gönderimde set edilir.
create or replace function public.claim_notification_outbox_items(
  p_outbox_id uuid default null,
  p_batch_size int default 25
)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select o.id
    from public.notification_outbox o
    where o.processed_at is null
      and (
        o.claimed_at is null
        or o.claimed_at < now() - interval '5 minutes'
      )
      and (p_outbox_id is null or o.id = p_outbox_id)
    order by o.created_at asc
    limit case when p_outbox_id is null then greatest(p_batch_size, 1) else 1 end
    for update skip locked
  )
  update public.notification_outbox o
  set claimed_at = now()
  from picked
  where o.id = picked.id
  returning o.*;
end;
$$;

create or replace function public.release_notification_outbox_claim(p_outbox_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_outbox
  set claimed_at = null
  where id = p_outbox_id
    and processed_at is null;
end;
$$;

create or replace function public.complete_notification_outbox_item(p_outbox_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_outbox
  set
    processed_at = now(),
    claimed_at = null
  where id = p_outbox_id;
end;
$$;

-- Takılı mesaj push kayıtlarını yeniden kuyruğa al.
update public.notification_outbox
set
  processed_at = null,
  claimed_at = null
where event_type in ('message', 'group_message')
  and processed_at is not null
  and coalesce(data->>'push_sent_at', '') = ''
  and created_at > now() - interval '14 days';

-- Edge function rozet sayısı: kullanıcı bazlı okunmamış mesaj toplamı.
create or replace function public.get_messaging_unread_count(p_user_id uuid)
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(sub.unread), 0)::bigint
  from (
    select (
      select count(*)
      from public.messages m
      where m.conversation_id = c.id
        and m.sender_id <> p_user_id
        and m.deleted_for_all = false
        and m.created_at > coalesce(cm.last_read_at, '1970-01-01'::timestamptz)
        and not exists (
          select 1 from public.message_deletions md
          where md.message_id = m.id and md.user_id = p_user_id
        )
    ) as unread
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
    where cm.user_id = p_user_id
      and cm.is_archived = false
      and (
        cm.hidden_at is null
        or coalesce(c.last_message_at, c.created_at) > cm.hidden_at
      )
  ) sub;
$$;

grant execute on function public.claim_notification_outbox_items(uuid, int) to service_role;
grant execute on function public.release_notification_outbox_claim(uuid) to service_role;
grant execute on function public.complete_notification_outbox_item(uuid) to service_role;
grant execute on function public.get_messaging_unread_count(uuid) to service_role;

notify pgrst, 'reload schema';
