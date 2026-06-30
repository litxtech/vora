-- Premium: sesli/görüntülü arama (yalnızca arayan)
-- Mesajlaşma: günlük limit kaldırıldı, sabitleme herkes için eşit

-- Günlük mesaj limiti trigger'ını kaldır
drop trigger if exists messages_daily_limit on public.messages;

-- Sabitleme: premium ayrımı yok, herkes 20 sohbet
create or replace function public.pin_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_limit integer := 20;
begin
  select count(*) into v_count
  from public.conversation_members
  where user_id = auth.uid() and is_pinned = true;

  if v_count >= v_limit then
    raise exception 'Sabitleme limitine ulaştınız';
  end if;

  update public.conversation_members
  set is_pinned = true, pinned_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();

  return found;
end;
$$;

-- Kalan mesaj hakkı: herkes için sınırsız (-1)
create or replace function public.get_message_daily_remaining()
returns int
language sql
security definer
set search_path = public
stable
as $$
  select -1;
$$;

-- Arama: yalnızca premium arayan başlatabilir (cevaplayan taraf serbest)
create or replace function public.enforce_premium_caller()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_premium boolean;
begin
  select coalesce(p.is_premium, false) into v_premium
  from public.profiles p
  where p.id = new.caller_id;

  if not v_premium then
    raise exception 'Sesli ve görüntülü arama için Premium abonelik gerekir.';
  end if;

  return new;
end;
$$;

drop trigger if exists call_sessions_premium_check on public.call_sessions;
create trigger call_sessions_premium_check
  before insert on public.call_sessions
  for each row execute function public.enforce_premium_caller();
