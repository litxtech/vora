-- Duyuru okunma takibi: hangi kullanıcı hangi duyuruyu açtı.
-- "Okuyanlar" listesi admin panelinde ve duyuru sahibine gösterilir.

create table if not exists public.announcement_views (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create index if not exists announcement_views_announcement_idx
  on public.announcement_views (announcement_id, created_at desc);

alter table public.announcement_views enable row level security;

-- Doğrudan erişim yok; tüm okuma/yazma SECURITY DEFINER RPC'ler üzerinden.

-- Kişi bazlı okunma kaydı + toplam sayaç (her kullanıcı yalnızca bir kez sayılır).
create or replace function public.record_announcement_view(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_new boolean := false;
begin
  if v_uid is not null then
    insert into public.announcement_views (announcement_id, user_id)
    values (p_id, v_uid)
    on conflict (announcement_id, user_id) do nothing;
    v_new := found;
  end if;

  -- Misafir her açılışta, kayıtlı kullanıcı yalnızca ilk okumada sayılır.
  if v_uid is null or v_new then
    update public.announcements
    set view_count = view_count + 1
    where id = p_id and is_active = true;
  end if;
end;
$$;

-- Bir duyuruyu okuyan kullanıcılar (yalnızca sahibi veya moderatör görebilir).
create or replace function public.list_announcement_viewers(
  p_id uuid,
  p_limit int default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_author uuid;
  v_limit int := greatest(1, least(coalesce(p_limit, 200), 500));
begin
  select author_id into v_author from public.announcements where id = p_id;
  if not found then
    raise exception 'not_found';
  end if;

  if not public.is_moderator() and (v_author is null or v_author <> v_uid) then
    raise exception 'forbidden';
  end if;

  return coalesce((
    select jsonb_agg(sub.obj order by sub.created_at desc)
    from (
      select
        jsonb_build_object(
          'user_id', p.id,
          'username', p.username,
          'full_name', p.full_name,
          'avatar_url', p.avatar_url,
          'viewed_at', v.created_at
        ) as obj,
        v.created_at
      from public.announcement_views v
      join public.profiles p on p.id = v.user_id
      where v.announcement_id = p_id
      order by v.created_at desc
      limit v_limit
    ) sub
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.list_announcement_viewers(uuid, int) from public;
grant execute on function public.list_announcement_viewers(uuid, int) to authenticated;
grant execute on function public.record_announcement_view(uuid) to anon, authenticated;
