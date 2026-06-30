-- Arama moderasyonu: canlı izleme ve genişletilmiş admin RPC'leri

create policy "call_sessions_moderator_read" on public.call_sessions
  for select to authenticated
  using (public.is_moderator());

drop function if exists public.admin_list_call_sessions(int);

create or replace function public.admin_list_call_sessions(p_limit int default 100)
returns table (
  id uuid,
  caller_id uuid,
  callee_id uuid,
  caller_username text,
  callee_username text,
  call_type text,
  status text,
  channel_name text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select
    cs.id,
    cs.caller_id,
    cs.callee_id,
    cp.username,
    cep.username,
    cs.call_type::text,
    cs.status::text,
    cs.channel_name,
    cs.started_at,
    cs.ended_at,
    cs.created_at
  from public.call_sessions cs
  join public.profiles cp on cp.id = cs.caller_id
  join public.profiles cep on cep.id = cs.callee_id
  order by
    case when cs.status in ('ringing', 'accepted') then 0 else 1 end,
    cs.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_terminate_all_call_sessions()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.call_sessions
  set status = 'ended', ended_at = now()
  where status in ('ringing', 'accepted');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.admin_list_call_sessions to authenticated;
grant execute on function public.admin_terminate_all_call_sessions to authenticated;
