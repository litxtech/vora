-- Push çoğaltma: outbox atomik claim + yinelenen token temizliği

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
      and (p_outbox_id is null or o.id = p_outbox_id)
    order by o.created_at asc
    limit case when p_outbox_id is null then greatest(p_batch_size, 1) else 1 end
    for update skip locked
  )
  update public.notification_outbox o
  set processed_at = now()
  from picked
  where o.id = picked.id
  returning o.*;
end;
$$;

-- Aynı expo/device token için yalnızca en güncel kayıt aktif kalsın
with ranked as (
  select
    pt.id,
    row_number() over (
      partition by pt.user_id, coalesce(pt.expo_push_token, pt.device_push_token, pt.id::text)
      order by pt.updated_at desc nulls last, pt.created_at desc
    ) as rn
  from public.push_tokens pt
  where pt.is_active = true
)
update public.push_tokens pt
set
  is_active = false,
  updated_at = now()
from ranked r
where pt.id = r.id
  and r.rn > 1;

grant execute on function public.claim_notification_outbox_items(uuid, int) to service_role;
