-- Push token kaydı: çoklu PATCH/UPSERT deadlock (40P01) önleme — tek RPC + advisory lock

create index if not exists push_tokens_user_expo_idx
  on public.push_tokens (user_id, expo_push_token)
  where expo_push_token is not null;

create or replace function public.register_push_token(
  p_user_id uuid,
  p_platform public.push_platform,
  p_device_id text,
  p_expo_push_token text default null,
  p_device_push_token text default null,
  p_app_version text default null,
  p_app_build text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception 'device_id required';
  end if;

  -- Aynı kullanıcıda eşzamanlı kayıtları sıraya al (deadlock önleme).
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  if p_expo_push_token is not null and btrim(p_expo_push_token) <> '' then
    update public.push_tokens
    set
      is_active = false,
      updated_at = now()
    where user_id = p_user_id
      and expo_push_token = p_expo_push_token
      and device_id is distinct from p_device_id;
  end if;

  insert into public.push_tokens (
    user_id,
    platform,
    device_id,
    expo_push_token,
    device_push_token,
    app_version,
    app_build,
    is_active,
    updated_at
  )
  values (
    p_user_id,
    p_platform,
    p_device_id,
    nullif(btrim(p_expo_push_token), ''),
    nullif(btrim(p_device_push_token), ''),
    nullif(btrim(p_app_version), ''),
    nullif(btrim(p_app_build), ''),
    true,
    now()
  )
  on conflict (user_id, device_id) do update
  set
    platform = excluded.platform,
    expo_push_token = excluded.expo_push_token,
    device_push_token = excluded.device_push_token,
    app_version = excluded.app_version,
    app_build = excluded.app_build,
    is_active = true,
    updated_at = now();
end;
$$;

grant execute on function public.register_push_token(
  uuid,
  public.push_platform,
  text,
  text,
  text,
  text,
  text
) to authenticated;

notify pgrst, 'reload schema';
