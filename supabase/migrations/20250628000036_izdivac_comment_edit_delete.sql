-- İzdivaç duvar yorumları: yazar tarafından düzenleme ve silme

alter table public.izdivac_post_comments
  add column if not exists is_edited boolean not null default false;

alter table public.izdivac_post_comments
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.izdivac_edit_post_comment(p_comment_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_author_id uuid;
  v_body text := trim(coalesce(p_body, ''));
begin
  if not public.izdivac_has_access(v_me) then
    raise exception 'İzdivaç erişiminiz yok';
  end if;
  if v_body = '' then
    raise exception 'Yorum boş olamaz';
  end if;

  select author_id into v_author_id from public.izdivac_post_comments where id = p_comment_id;
  if v_author_id is null then
    raise exception 'Yorum bulunamadı';
  end if;
  if v_author_id is distinct from v_me then
    raise exception 'Bu yorumu düzenleme yetkiniz yok';
  end if;

  update public.izdivac_post_comments
  set body = v_body,
      is_edited = true,
      updated_at = now()
  where id = p_comment_id;
end;
$$;

create or replace function public.izdivac_delete_post_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_author_id uuid;
  v_post_id uuid;
begin
  if not public.izdivac_has_access(v_me) then
    raise exception 'İzdivaç erişiminiz yok';
  end if;

  select author_id, post_id into v_author_id, v_post_id
  from public.izdivac_post_comments where id = p_comment_id;

  if v_author_id is null then
    raise exception 'Yorum bulunamadı';
  end if;
  if v_author_id is distinct from v_me then
    raise exception 'Bu yorumu silme yetkiniz yok';
  end if;

  delete from public.izdivac_post_comments where id = p_comment_id;

  update public.izdivac_posts
  set comment_count = greatest(0, comment_count - 1)
  where id = v_post_id;
end;
$$;

drop function if exists public.izdivac_list_post_comments(uuid);

create or replace function public.izdivac_list_post_comments(p_post_id uuid)
returns table (
  comment_id uuid,
  author_id uuid,
  author_first_name text,
  author_avatar_url text,
  body text,
  is_edited boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.author_id,
    coalesce(nullif(trim(p.first_name), ''), split_part(coalesce(p.full_name, ''), ' ', 1)),
    p.avatar_url,
    c.body,
    c.is_edited,
    c.created_at
  from public.izdivac_post_comments c
  inner join public.profiles p on p.id = c.author_id
  where c.post_id = p_post_id
    and public.izdivac_has_access()
  order by c.created_at asc;
$$;

grant execute on function public.izdivac_edit_post_comment(uuid, text) to authenticated;
grant execute on function public.izdivac_delete_post_comment(uuid) to authenticated;
grant execute on function public.izdivac_list_post_comments(uuid) to authenticated;
