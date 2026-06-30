-- Misafir hesaplar otomatik e-posta doğrulaması alır (kullanıcı mail yazmaz / onaylamaz)

create or replace function public.is_guest_auth_email(p_email text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(p_email, '')) ~ '^guest_[a-z0-9]+@vora\.app$';
$$;

create or replace function public.auto_confirm_guest_auth_user()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if public.is_guest_auth_email(new.email)
     or coalesce((new.raw_user_meta_data->>'is_guest')::boolean, false) then
    new.email_confirmed_at := timezone('utc', now());
  end if;
  return new;
end;
$$;

drop trigger if exists auto_confirm_guest_auth_user on auth.users;
create trigger auto_confirm_guest_auth_user
  before insert on auth.users
  for each row
  execute function public.auto_confirm_guest_auth_user();

-- Mevcut onaysız misafir hesapları düzelt
update auth.users
set email_confirmed_at = timezone('utc', now())
where public.is_guest_auth_email(email)
  and email_confirmed_at is null;

-- İstemci yedek: kayıt sonrası giriş başarısız olursa onayla ve tekrar dene
create or replace function public.confirm_guest_auth_email(p_email text)
returns boolean
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  v_updated integer;
begin
  if not public.is_guest_auth_email(p_email) then
    return false;
  end if;

  update auth.users
  set email_confirmed_at = timezone('utc', now())
  where lower(email) = lower(p_email)
    and email_confirmed_at is null;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

grant execute on function public.confirm_guest_auth_email(text) to anon, authenticated;
