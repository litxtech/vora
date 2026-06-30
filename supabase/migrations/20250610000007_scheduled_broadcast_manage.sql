-- Zamanlanmış duyuru: iptal, düzenle, sil

alter table public.scheduled_broadcasts
  add column if not exists is_cancelled boolean not null default false;

drop index if exists public.scheduled_broadcasts_pending_idx;
create index scheduled_broadcasts_pending_idx
  on public.scheduled_broadcasts (scheduled_at)
  where is_sent = false and is_cancelled = false;

drop function if exists public.admin_list_scheduled_broadcasts(int);

create or replace function public.admin_list_scheduled_broadcasts(p_limit int default 50)
returns table (
  id uuid,
  title text,
  body text,
  broadcast_type public.broadcast_type,
  region_id text,
  scheduled_at timestamptz,
  is_sent boolean,
  is_cancelled boolean,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  return query
  select
    sb.id,
    sb.title,
    sb.body,
    sb.broadcast_type,
    sb.region_id,
    sb.scheduled_at,
    sb.is_sent,
    sb.is_cancelled,
    sb.created_at
  from public.scheduled_broadcasts sb
  order by sb.scheduled_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_update_scheduled_broadcast(
  p_id uuid,
  p_title text,
  p_body text,
  p_broadcast_type public.broadcast_type,
  p_scheduled_at timestamptz
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;

  update public.scheduled_broadcasts
  set
    title = p_title,
    body = p_body,
    broadcast_type = p_broadcast_type,
    scheduled_at = p_scheduled_at
  where id = p_id
    and is_sent = false
    and is_cancelled = false;

  if not found then
    raise exception 'Duyuru düzenlenemedi (gönderilmiş veya iptal edilmiş olabilir).';
  end if;
end;
$$;

create or replace function public.admin_cancel_scheduled_broadcast(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;

  update public.scheduled_broadcasts
  set is_cancelled = true
  where id = p_id
    and is_sent = false
    and is_cancelled = false;

  if not found then
    raise exception 'Duyuru iptal edilemedi (gönderilmiş veya zaten iptal edilmiş olabilir).';
  end if;
end;
$$;

create or replace function public.admin_delete_scheduled_broadcast(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;

  delete from public.scheduled_broadcasts
  where id = p_id
    and is_sent = false;

  if not found then
    raise exception 'Gönderilmiş duyurular silinemez.';
  end if;
end;
$$;

grant execute on function public.admin_list_scheduled_broadcasts(int) to authenticated;
grant execute on function public.admin_update_scheduled_broadcast(uuid, text, text, public.broadcast_type, timestamptz) to authenticated;
grant execute on function public.admin_cancel_scheduled_broadcast(uuid) to authenticated;
grant execute on function public.admin_delete_scheduled_broadcast(uuid) to authenticated;
