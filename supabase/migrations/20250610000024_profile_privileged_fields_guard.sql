-- Kullanıcıların kendi profilinde yetki / premium / güven alanlarını değiştirmesini engeller.
-- Service role, moderatör RPC'leri ve başka kullanıcı satırları etkilenmez.

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.is_moderator() then
    return new;
  end if;

  if old.id is distinct from auth.uid() then
    return new;
  end if;

  if old.role is distinct from new.role then
    new.role := old.role;
  end if;
  if old.is_premium is distinct from new.is_premium then
    new.is_premium := old.is_premium;
  end if;
  if old.is_verified is distinct from new.is_verified then
    new.is_verified := old.is_verified;
  end if;
  if old.trust_score is distinct from new.trust_score then
    new.trust_score := old.trust_score;
  end if;
  if old.news_verification_granted is distinct from new.news_verification_granted then
    new.news_verification_granted := old.news_verification_granted;
  end if;
  if old.reporter_level is distinct from new.reporter_level then
    new.reporter_level := old.reporter_level;
  end if;
  if old.contribution_score is distinct from new.contribution_score then
    new.contribution_score := old.contribution_score;
  end if;
  if old.verified_content_count is distinct from new.verified_content_count then
    new.verified_content_count := old.verified_content_count;
  end if;
  if old.stripe_customer_id is distinct from new.stripe_customer_id then
    new.stripe_customer_id := old.stripe_customer_id;
  end if;
  if old.profile_boosted_until is distinct from new.profile_boosted_until then
    new.profile_boosted_until := old.profile_boosted_until;
  end if;
  if old.account_status is distinct from new.account_status then
    new.account_status := old.account_status;
  end if;
  if old.is_guest is distinct from new.is_guest then
    if not (old.is_guest = true and new.is_guest = false) then
      new.is_guest := old.is_guest;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_fields on public.profiles;
create trigger profiles_protect_privileged_fields
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_fields();
