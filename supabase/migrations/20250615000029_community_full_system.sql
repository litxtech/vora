-- Topluluk tam sistem: sohbet bağlantısı, gönderi sayacı, üye senkronu

alter table public.communities
  add column if not exists conversation_id uuid references public.conversations (id) on delete set null;

create index if not exists communities_conversation_idx on public.communities (conversation_id)
  where conversation_id is not null;

-- Gönderi sayacı (kanallar ile aynı model)
create or replace function public.sync_community_post_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.community_id is not null and new.status = 'published' then
      update public.communities set post_count = post_count + 1, updated_at = now()
      where id = new.community_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.community_id is not null and old.status = 'published' then
      update public.communities set post_count = greatest(post_count - 1, 0), updated_at = now()
      where id = old.community_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.community_id is distinct from new.community_id or old.status is distinct from new.status then
      if old.community_id is not null and old.status = 'published' then
        update public.communities set post_count = greatest(post_count - 1, 0), updated_at = now()
        where id = old.community_id;
      end if;
      if new.community_id is not null and new.status = 'published' then
        update public.communities set post_count = post_count + 1, updated_at = now()
        where id = new.community_id;
      end if;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists posts_community_count_sync on public.posts;
create trigger posts_community_count_sync
  after insert or update or delete on public.posts
  for each row execute function public.sync_community_post_count();

update public.communities c
set post_count = (
  select count(*)::int
  from public.posts p
  where p.community_id = c.id and p.status = 'published'
);

-- Topluluk gönderisi yalnızca üyelere
create or replace function public.validate_community_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.community_id is not null then
    if not exists (
      select 1 from public.community_members cm
      where cm.community_id = new.community_id and cm.user_id = new.author_id
    ) then
      raise exception 'Topluluk üyesi olmadan gönderi paylaşılamaz';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_community_membership_check on public.posts;
create trigger posts_community_membership_check
  before insert or update of community_id, author_id on public.posts
  for each row execute function public.validate_community_post();

-- Topluluk sohbeti oluştur
create or replace function public.create_community_conversation(
  p_community_id uuid,
  p_creator_id uuid,
  p_title text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  select conversation_id into v_conversation_id
  from public.communities
  where id = p_community_id;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (type, title, created_by)
  values ('group', left(trim(p_title), 80), p_creator_id)
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_conversation_id, p_creator_id, 'founder')
  on conflict do nothing;

  update public.communities
  set conversation_id = v_conversation_id, updated_at = now()
  where id = p_community_id;

  return v_conversation_id;
end;
$$;

create or replace function public.on_community_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_community_conversation(new.id, new.created_by, new.name);
  return new;
end;
$$;

drop trigger if exists community_created_setup on public.communities;
create trigger community_created_setup
  after insert on public.communities
  for each row execute function public.on_community_created();

-- Üye ↔ sohbet senkronu
create or replace function public.map_community_role_to_chat(p_role public.community_member_role)
returns text
language sql
immutable
as $$
  select case p_role
    when 'owner' then 'founder'
    when 'admin' then 'admin'
    when 'moderator' then 'moderator'
    else 'member'
  end;
$$;

create or replace function public.on_community_member_chat_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
  v_chat_role text;
begin
  if tg_op = 'INSERT' then
    select conversation_id into v_conversation_id
    from public.communities
    where id = new.community_id;

    if v_conversation_id is null then
      select public.create_community_conversation(
        new.community_id,
        (select created_by from public.communities where id = new.community_id),
        (select name from public.communities where id = new.community_id)
      ) into v_conversation_id;
    end if;

    v_chat_role := public.map_community_role_to_chat(new.role);

    insert into public.conversation_members (conversation_id, user_id, role)
    values (v_conversation_id, new.user_id, v_chat_role::public.conversation_member_role)
    on conflict (conversation_id, user_id) do update
      set role = excluded.role
      where conversation_members.role <> 'founder' or excluded.role = 'founder';

  elsif tg_op = 'DELETE' then
    select conversation_id into v_conversation_id
    from public.communities
    where id = old.community_id;

    if v_conversation_id is not null then
      delete from public.conversation_members
      where conversation_id = v_conversation_id and user_id = old.user_id;
    end if;
  elsif tg_op = 'UPDATE' and old.role is distinct from new.role then
    select conversation_id into v_conversation_id
    from public.communities
    where id = new.community_id;

    if v_conversation_id is not null then
      v_chat_role := public.map_community_role_to_chat(new.role);
      update public.conversation_members
      set role = v_chat_role::public.conversation_member_role
      where conversation_id = v_conversation_id
        and user_id = new.user_id
        and role <> 'founder';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists community_member_chat_sync on public.community_members;
create trigger community_member_chat_sync
  after insert or update or delete on public.community_members
  for each row execute function public.on_community_member_chat_sync();

-- Mevcut topluluklar için sohbet oluştur (backfill)
do $$
declare
  r record;
begin
  for r in
    select c.id, c.created_by, c.name
    from public.communities c
    where c.conversation_id is null
  loop
    perform public.create_community_conversation(r.id, r.created_by, r.name);
  end loop;
end;
$$;

-- Mevcut üyeleri sohbete ekle
insert into public.conversation_members (conversation_id, user_id, role)
select
  c.conversation_id,
  cm.user_id,
  public.map_community_role_to_chat(cm.role)::public.conversation_member_role
from public.community_members cm
join public.communities c on c.id = cm.community_id
where c.conversation_id is not null
on conflict (conversation_id, user_id) do nothing;

-- Üye rolü güncelleme
create or replace function public.update_community_member_role(
  p_community_id uuid,
  p_member_id uuid,
  p_new_role public.community_member_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_role public.community_member_role;
begin
  select role into v_my_role
  from public.community_members
  where community_id = p_community_id and user_id = auth.uid();

  if v_my_role not in ('owner', 'admin') then
    raise exception 'Yetkiniz yok';
  end if;

  if p_new_role = 'owner' and v_my_role <> 'owner' then
    raise exception 'Yalnızca kurucu sahipliği devredebilir';
  end if;

  update public.community_members
  set role = p_new_role
  where community_id = p_community_id and user_id = p_member_id;
end;
$$;

-- Üye çıkarma
create or replace function public.remove_community_member(
  p_community_id uuid,
  p_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_role public.community_member_role;
  v_target_role public.community_member_role;
begin
  select role into v_my_role
  from public.community_members
  where community_id = p_community_id and user_id = auth.uid();

  select role into v_target_role
  from public.community_members
  where community_id = p_community_id and user_id = p_member_id;

  if v_target_role is null then
    return;
  end if;

  if p_member_id = auth.uid() then
    if v_target_role = 'owner' then
      raise exception 'Kurucu topluluktan ayrılamaz. Önce sahipliği devredin.';
    end if;
  elsif v_my_role not in ('owner', 'admin', 'moderator') then
    raise exception 'Yetkiniz yok';
  elsif v_target_role = 'owner' then
    raise exception 'Kurucu çıkarılamaz';
  elsif v_my_role = 'moderator' and v_target_role in ('admin', 'moderator') then
    raise exception 'Yetkiniz yok';
  end if;

  delete from public.community_members
  where community_id = p_community_id and user_id = p_member_id;
end;
$$;

grant execute on function public.create_community_conversation(uuid, uuid, text) to authenticated;
grant execute on function public.update_community_member_role(uuid, uuid, public.community_member_role) to authenticated;
grant execute on function public.remove_community_member(uuid, uuid) to authenticated;
