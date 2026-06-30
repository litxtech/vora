-- Haber doğrulama yetkisi: admin paneli + 100 güven puanı otomatik

alter table public.profiles
  add column if not exists news_verification_granted boolean not null default false;

create index if not exists profiles_news_verification_granted_idx
  on public.profiles (news_verification_granted)
  where news_verification_granted = true;

-- 100+ güven puanına ulaşanlara otomatik yetki
create or replace function public.sync_news_verification_permission(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  update public.profiles
  set
    news_verification_granted = true,
    updated_at = now()
  where id = p_user_id
    and trust_score >= 100
    and news_verification_granted = false;
end;
$$;

create or replace function public.can_vote_verification(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id
      and (
        role in ('verified_reporter', 'moderator', 'admin', 'super_admin')
        or news_verification_granted
      )
  );
$$;

-- Güven puanı değişince otomatik yetki kontrolü
create or replace function public.adjust_trust_score(p_user_id uuid, p_delta int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_delta = 0 then
    return;
  end if;

  update public.profiles
  set trust_score = greatest(0, least(1000, trust_score + p_delta)),
      updated_at = now()
  where id = p_user_id;

  if p_delta > 0 then
    insert into public.user_badges (user_id, badge_type)
    select p_user_id, 'trusted_contributor'
    from public.profiles
    where id = p_user_id and trust_score >= 200
    on conflict do nothing;
  end if;

  perform public.sync_news_verification_permission(p_user_id);
  perform public.sync_reporter_level(p_user_id);
end;
$$;

create or replace function public.trg_profiles_sync_news_verification_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trust_score is distinct from old.trust_score and new.trust_score >= 100 then
    new.news_verification_granted := true;
  end if;
  return new;
end;
$$;

create or replace function public.trg_profiles_init_news_verification_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trust_score >= 100 then
    new.news_verification_granted := true;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_init_news_verification_permission on public.profiles;
create trigger profiles_init_news_verification_permission
  before insert on public.profiles
  for each row
  execute function public.trg_profiles_init_news_verification_permission();

drop trigger if exists profiles_sync_news_verification_permission on public.profiles;
create trigger profiles_sync_news_verification_permission
  before update of trust_score, news_verification_granted on public.profiles
  for each row
  execute function public.trg_profiles_sync_news_verification_permission();

-- Mevcut 100+ kullanıcıları geriye dönük yetkilendir
update public.profiles
set news_verification_granted = true
where trust_score >= 100
  and news_verification_granted = false;

-- Admin panelinden yetki ver / kaldır
create or replace function public.admin_set_news_verification_granted(
  p_user_id uuid,
  p_granted boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  update public.profiles
  set
    news_verification_granted = p_granted,
    updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'Kullanıcı bulunamadı';
  end if;

end;
$$;

grant execute on function public.sync_news_verification_permission(uuid) to authenticated;
grant execute on function public.admin_set_news_verification_granted(uuid, boolean) to authenticated;
