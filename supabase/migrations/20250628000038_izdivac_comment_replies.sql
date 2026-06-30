-- İzdivaç duvar yorumları: yanıtlama (threaded reply) altyapısı

alter table public.izdivac_post_comments
  add column if not exists parent_comment_id uuid
    references public.izdivac_post_comments (id) on delete cascade;

create index if not exists izdivac_post_comments_parent_idx
  on public.izdivac_post_comments (parent_comment_id);

-- Yorum ekleme: opsiyonel üst yorum (yanıt) desteği
drop function if exists public.izdivac_add_post_comment(uuid, text);

create or replace function public.izdivac_add_post_comment(
  p_post_id uuid,
  p_body text,
  p_parent_comment_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_comment_id uuid;
  v_author_id uuid;
  v_parent_author_id uuid;
  v_parent_post_id uuid;
  v_body text := trim(coalesce(p_body, ''));
begin
  if not public.izdivac_has_access(v_me) then
    raise exception 'İzdivaç erişiminiz yok';
  end if;
  if v_body = '' then
    raise exception 'Yorum boş olamaz';
  end if;

  select author_id into v_author_id from public.izdivac_posts where id = p_post_id;
  if v_author_id is null then
    raise exception 'Paylaşım bulunamadı';
  end if;

  if p_parent_comment_id is not null then
    select author_id, post_id
      into v_parent_author_id, v_parent_post_id
      from public.izdivac_post_comments
      where id = p_parent_comment_id;

    if v_parent_author_id is null then
      raise exception 'Yanıtlanacak yorum bulunamadı';
    end if;
    if v_parent_post_id is distinct from p_post_id then
      raise exception 'Yanıt bu paylaşıma ait değil';
    end if;
  end if;

  insert into public.izdivac_post_comments (post_id, author_id, body, parent_comment_id)
  values (p_post_id, v_me, v_body, p_parent_comment_id)
  returning id into v_comment_id;

  update public.izdivac_posts set comment_count = comment_count + 1 where id = p_post_id;

  -- Paylaşım sahibine bildirim (kendi yorumunda bildirim yok)
  if v_author_id is distinct from v_me then
    perform public.notify_profile_user(
      v_author_id,
      'izdivac_post_comment',
      'İzdivaç duvarında yorum',
      left(v_body, 120),
      jsonb_build_object(
        'kind', 'izdivac_post_comment',
        'post_id', p_post_id,
        'comment_id', v_comment_id,
        'actor_id', v_me,
        'deep_link', '/izdivac-center?tab=wall',
        'action_hint', 'Duvara git'
      )
    );
  end if;

  -- Yanıtlanan yorumun sahibine bildirim (kendisi ve paylaşım sahibi hariç)
  if p_parent_comment_id is not null
     and v_parent_author_id is distinct from v_me
     and v_parent_author_id is distinct from v_author_id then
    perform public.notify_profile_user(
      v_parent_author_id,
      'izdivac_post_comment',
      'Yorumuna yanıt geldi',
      left(v_body, 120),
      jsonb_build_object(
        'kind', 'izdivac_post_comment',
        'post_id', p_post_id,
        'comment_id', v_comment_id,
        'parent_comment_id', p_parent_comment_id,
        'actor_id', v_me,
        'deep_link', '/izdivac-center?tab=wall',
        'action_hint', 'Duvara git'
      )
    );
  end if;

  return v_comment_id;
end;
$$;

-- Silme: alt yanıtlar cascade ile silinir, comment_count buna göre azaltılır
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
  v_removed integer;
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

  -- Silinecek yorum + tüm alt yanıtların sayısı
  with recursive descendants as (
    select id from public.izdivac_post_comments where id = p_comment_id
    union all
    select c.id
    from public.izdivac_post_comments c
    inner join descendants d on c.parent_comment_id = d.id
  )
  select count(*) into v_removed from descendants;

  delete from public.izdivac_post_comments where id = p_comment_id;

  update public.izdivac_posts
  set comment_count = greatest(0, comment_count - v_removed)
  where id = v_post_id;
end;
$$;

-- Listeleme: parent_comment_id alanını da döndür
drop function if exists public.izdivac_list_post_comments(uuid);

create or replace function public.izdivac_list_post_comments(p_post_id uuid)
returns table (
  comment_id uuid,
  parent_comment_id uuid,
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
    c.parent_comment_id,
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

grant execute on function public.izdivac_add_post_comment(uuid, text, uuid) to authenticated;
grant execute on function public.izdivac_delete_post_comment(uuid) to authenticated;
grant execute on function public.izdivac_list_post_comments(uuid) to authenticated;
