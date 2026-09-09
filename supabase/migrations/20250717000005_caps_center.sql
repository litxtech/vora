-- Caps merkezi: resim veya video üretim + üretici sıralaması

create or replace function public.create_cap(
  p_image_url text,
  p_storage_path text,
  p_thumb_url text default null,
  p_title text default null,
  p_width integer default null,
  p_height integer default null,
  p_video_url text default null,
  p_duration_ms integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_count integer;
  v_has_image boolean;
  v_has_video boolean;
begin
  if auth.uid() is null then
    raise exception 'Giriş gerekli';
  end if;

  v_has_image := p_image_url is not null and length(trim(p_image_url)) > 0;
  v_has_video := p_video_url is not null and length(trim(p_video_url)) > 0;

  if not v_has_image and not v_has_video then
    raise exception 'Caps için resim veya video gerekli';
  end if;

  if not v_has_image then
    raise exception 'Caps için poster / resim URL gerekli';
  end if;

  if p_duration_ms is not null and (p_duration_ms <= 0 or p_duration_ms > 3500) then
    raise exception 'Caps videosu en fazla 3 saniye olabilir';
  end if;

  select count(*)::integer into v_count
  from public.caps
  where creator_id = auth.uid() and status = 'published';

  if v_count >= 50 then
    raise exception 'En fazla 50 caps oluşturabilirsiniz';
  end if;

  insert into public.caps (
    creator_id, title, image_url, storage_path, thumb_url, video_url, duration_ms, width, height, status
  )
  values (
    auth.uid(),
    nullif(trim(p_title), ''),
    p_image_url,
    p_storage_path,
    p_thumb_url,
    nullif(trim(coalesce(p_video_url, '')), ''),
    p_duration_ms,
    p_width,
    p_height,
    'published'
  )
  returning id into v_id;

  insert into public.user_cap_library (user_id, cap_id, source)
  values (auth.uid(), v_id, 'created')
  on conflict do nothing;

  return v_id;
end;
$$;

grant execute on function public.create_cap(text, text, text, text, integer, integer, text, integer)
  to authenticated;

-- Caps üreticileri sıralaması: kullanım + caps sayısı
create or replace function public.get_caps_creator_leaderboard(p_limit integer default 50)
returns table (
  creator_id uuid,
  username text,
  full_name text,
  avatar_url text,
  caps_count integer,
  total_unique_users integer,
  total_library_saves integer,
  rank integer
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select
      c.creator_id,
      count(*)::integer as caps_count,
      coalesce(sum(c.unique_user_count), 0)::integer as total_unique_users,
      coalesce(sum(c.library_count), 0)::integer as total_library_saves
    from public.caps c
    where c.status = 'published'
    group by c.creator_id
  )
  select
    r.creator_id,
    p.username,
    p.full_name,
    p.avatar_url,
    r.caps_count,
    r.total_unique_users,
    r.total_library_saves,
    (row_number() over (
      order by r.total_unique_users desc, r.caps_count desc, r.total_library_saves desc
    ))::integer as rank
  from ranked r
  join public.profiles p on p.id = r.creator_id
  order by r.total_unique_users desc, r.caps_count desc, r.total_library_saves desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.get_caps_creator_leaderboard(integer) from public;
grant execute on function public.get_caps_creator_leaderboard(integer) to authenticated;
grant execute on function public.get_caps_creator_leaderboard(integer) to anon;
