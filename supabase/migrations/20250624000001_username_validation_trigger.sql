-- normalize_and_validate_profile_username fonksiyonu 20250623000008 ile tanımlı;
-- tetikleyici hiç uygulanmamıştı (eski 20250623000004 çakışması).

drop trigger if exists profiles_normalize_validate_username on public.profiles;
create trigger profiles_normalize_validate_username
  before insert or update of username on public.profiles
  for each row execute function public.normalize_and_validate_profile_username();
