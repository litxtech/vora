-- Kaydedilen müzikler (kullanıcı favorileri)

create table if not exists public.user_saved_music (
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.music_tracks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create index if not exists user_saved_music_user_idx
  on public.user_saved_music (user_id, created_at desc);

alter table public.user_saved_music enable row level security;

drop policy if exists user_saved_music_self on public.user_saved_music;
create policy user_saved_music_self on public.user_saved_music
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.toggle_saved_music(p_track_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_exists boolean;
begin
  if v_uid is null then
    raise exception 'Oturum gerekli';
  end if;

  select exists (
    select 1 from public.user_saved_music
    where user_id = v_uid and track_id = p_track_id
  ) into v_exists;

  if v_exists then
    delete from public.user_saved_music
    where user_id = v_uid and track_id = p_track_id;
    return false;
  end if;

  insert into public.user_saved_music (user_id, track_id)
  values (v_uid, p_track_id)
  on conflict do nothing;

  return true;
end;
$$;

grant execute on function public.toggle_saved_music(uuid) to authenticated;
