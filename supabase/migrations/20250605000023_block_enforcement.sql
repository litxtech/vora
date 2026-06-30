-- Engelleme: takip ve arama koruması

create or replace function public.prevent_blocked_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_user_blocked(new.follower_id, new.following_id) then
    raise exception 'Bu kullanıcıyı takip edemezsiniz';
  end if;
  return new;
end;
$$;

drop trigger if exists follows_block_check on public.follows;
create trigger follows_block_check
  before insert on public.follows
  for each row execute function public.prevent_blocked_follow();

create or replace function public.prevent_blocked_call()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_user_blocked(new.caller_id, new.callee_id) then
    raise exception 'Bu kullanıcıyı arayamazsınız';
  end if;
  return new;
end;
$$;

drop trigger if exists call_sessions_block_check on public.call_sessions;
create trigger call_sessions_block_check
  before insert on public.call_sessions
  for each row execute function public.prevent_blocked_call();
