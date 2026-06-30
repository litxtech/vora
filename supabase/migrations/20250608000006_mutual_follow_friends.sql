-- Karşılıklı takip = arkadaşlık
create or replace function public.are_friends(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.follows f1
    join public.follows f2
      on f1.follower_id = f2.following_id
     and f1.following_id = f2.follower_id
    where f1.follower_id = p_user_a
      and f1.following_id = p_user_b
  );
$$;

create or replace function public.can_view_profile_row(p_profile_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_visibility public.profile_visibility;
  v_is_guest boolean;
begin
  if auth.uid() = p_profile_id then
    return true;
  end if;
  if auth.uid() is null then
    select profile_visibility into v_visibility from public.profiles where id = p_profile_id;
    return v_visibility = 'public';
  end if;

  select profile_visibility into v_visibility from public.profiles where id = p_profile_id;
  if not found then
    return false;
  end if;

  select coalesce(is_guest, false) into v_is_guest from public.profiles where id = auth.uid();

  case v_visibility
    when 'public' then return true;
    when 'members' then return not v_is_guest;
    when 'friends' then
      return not v_is_guest and public.are_friends(auth.uid(), p_profile_id);
    else return false;
  end case;
end;
$$;

create or replace function public.can_view_post_audience(
  p_post_id uuid,
  p_viewer_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_audience public.post_audience;
begin
  select author_id, audience into v_author_id, v_audience
  from public.posts where id = p_post_id and status = 'published';

  if not found then
    return false;
  end if;
  if p_viewer_id is null then
    return v_audience = 'public';
  end if;
  if p_viewer_id = v_author_id then
    return true;
  end if;

  case v_audience
    when 'public' then return true;
    when 'friends' then
      return public.are_friends(p_viewer_id, v_author_id);
    when 'close_friends' then
      return exists (
        select 1 from public.close_friends cf
        where cf.user_id = v_author_id and cf.friend_id = p_viewer_id
      );
    else return false;
  end case;
end;
$$;
