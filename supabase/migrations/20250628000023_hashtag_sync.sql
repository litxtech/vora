-- Hashtag: gönderi etiket senkronu ve okuma (RLS bypass)

create or replace function public.sync_post_hashtags(p_post_id uuid, p_tags text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tag text;
  v_hashtag_id uuid;
  v_author_id uuid;
begin
  if p_tags is null or array_length(p_tags, 1) is null then
    return;
  end if;

  select author_id into v_author_id
  from public.posts
  where id = p_post_id;

  if v_author_id is null then
    return;
  end if;

  if auth.uid() is not null
    and auth.uid() is distinct from v_author_id
    and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'not authorized';
  end if;

  foreach v_tag in array p_tags loop
    v_tag := lower(trim(both ' #' from coalesce(v_tag, '')));
    if v_tag = '' then
      continue;
    end if;

    insert into public.hashtags (tag)
    values (v_tag)
    on conflict (tag) do nothing;

    select id into v_hashtag_id
    from public.hashtags
    where tag = v_tag;

    if v_hashtag_id is null then
      continue;
    end if;

    insert into public.post_hashtags (post_id, hashtag_id)
    values (p_post_id, v_hashtag_id)
    on conflict do nothing;

    update public.hashtags
    set post_count = (
      select count(*)::int
      from public.post_hashtags ph
      where ph.hashtag_id = v_hashtag_id
    )
    where id = v_hashtag_id;
  end loop;
end;
$$;

grant execute on function public.sync_post_hashtags(uuid, text[]) to authenticated;

-- Mevcut yayınlanmış gönderiler için etiket bağlantılarını onar
do $$
declare
  r record;
  v_tags text[];
begin
  for r in
    select p.id, p.content
    from public.posts p
    where p.status = 'published'
      and p.content ~ '#'
      and not exists (
        select 1 from public.post_hashtags ph where ph.post_id = p.id
      )
    limit 5000
  loop
    select coalesce(array_agg(distinct lower(substring(m[1] from 1))), '{}')
    into v_tags
    from regexp_matches(r.content, '#([[:alnum:]_]+)', 'g') as m;

    if array_length(v_tags, 1) is not null then
      perform public.sync_post_hashtags(r.id, v_tags);
    end if;
  end loop;
end;
$$;
