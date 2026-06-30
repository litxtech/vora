-- Gönderi sabitleme sistemi — admin panel + akış üst sırası

alter table public.posts
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references public.profiles (id) on delete set null,
  add column if not exists pinned_until timestamptz,
  add column if not exists pin_priority int not null default 0;

create index if not exists posts_pinned_feed_idx
  on public.posts (region_id, pin_priority desc, pinned_at desc)
  where is_pinned = true and status = 'published';

-- Süresi dolmuş sabitlemeleri temizle
create or replace function public.expire_post_pins()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set
    is_pinned = false,
    pinned_at = null,
    pinned_by = null,
    pinned_until = null,
    pin_priority = 0,
    updated_at = now()
  where is_pinned = true
    and pinned_until is not null
    and pinned_until <= now();
end;
$$;

create or replace function public.admin_pin_post(
  p_post_id uuid,
  p_days int default null,
  p_priority int default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_until timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  perform public.expire_post_pins();

  if p_days is not null and p_days > 0 then
    v_until := now() + (p_days || ' days')::interval;
  else
    v_until := null;
  end if;

  update public.posts
  set
    is_pinned = true,
    pinned_at = now(),
    pinned_by = auth.uid(),
    pinned_until = v_until,
    pin_priority = greatest(0, coalesce(p_priority, 0)),
    updated_at = now()
  where id = p_post_id
    and status = 'published';

  if not found then
    raise exception 'Gönderi bulunamadı veya yayında değil';
  end if;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, metadata)
  values (
    auth.uid(),
    'post',
    p_post_id,
    'warn',
    'Gönderi sabitlendi',
    jsonb_build_object(
      'pin_days', p_days,
      'pin_until', v_until,
      'pin_priority', p_priority
    )
  );
end;
$$;

create or replace function public.admin_unpin_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  update public.posts
  set
    is_pinned = false,
    pinned_at = null,
    pinned_by = null,
    pinned_until = null,
    pin_priority = 0,
    updated_at = now()
  where id = p_post_id and is_pinned = true;

  if found then
    insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
    values (auth.uid(), 'post', p_post_id, 'warn', 'Gönderi sabitlemesi kaldırıldı');
  end if;
end;
$$;

create or replace function public.admin_update_post_pin(
  p_post_id uuid,
  p_days int default null,
  p_priority int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_until timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  perform public.expire_post_pins();

  if p_days is not null then
    if p_days <= 0 then
      v_until := null;
    else
      v_until := now() + (p_days || ' days')::interval;
    end if;
  end if;

  update public.posts
  set
    pinned_until = case when p_days is not null then v_until else pinned_until end,
    pin_priority = case when p_priority is not null then greatest(0, p_priority) else pin_priority end,
    updated_at = now()
  where id = p_post_id and is_pinned = true;

  if not found then
    raise exception 'Sabitleme bulunamadı';
  end if;
end;
$$;

create or replace function public.admin_list_pinned_posts(p_limit int default 50)
returns table (
  post_id uuid,
  title text,
  content text,
  author_id uuid,
  author_username text,
  region_id uuid,
  pinned_at timestamptz,
  pinned_until timestamptz,
  pin_priority int,
  pinned_by uuid,
  pinned_by_username text,
  view_count int,
  like_count int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  perform public.expire_post_pins();

  return query
  select
    p.id,
    p.title,
    p.content,
    p.author_id,
    author.username,
    p.region_id,
    p.pinned_at,
    p.pinned_until,
    p.pin_priority,
    p.pinned_by,
    pin_admin.username,
    p.view_count,
    p.like_count
  from public.posts p
  join public.profiles author on author.id = p.author_id
  left join public.profiles pin_admin on pin_admin.id = p.pinned_by
  where p.is_pinned = true
    and p.status = 'published'
    and (p.pinned_until is null or p.pinned_until > now())
  order by p.pin_priority desc, p.pinned_at desc
  limit p_limit;
end;
$$;

insert into public.admin_role_permissions (role, permission_key, allowed) values
  ('admin', 'content.pin', true),
  ('super_admin', 'content.pin', true),
  ('moderator', 'content.pin', false)
on conflict (role, permission_key) do nothing;

grant execute on function public.expire_post_pins to authenticated;
grant execute on function public.admin_pin_post to authenticated;
grant execute on function public.admin_unpin_post to authenticated;
grant execute on function public.admin_update_post_pin to authenticated;
grant execute on function public.admin_list_pinned_posts to authenticated;
