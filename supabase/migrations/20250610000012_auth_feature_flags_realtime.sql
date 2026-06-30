-- Lobi / auth buton görünürlüğü + admin değişikliklerinin anlık yansıması

insert into public.app_feature_flags (feature_id, label, feature_group) values
  ('apple-sign-in', 'Apple ile Giriş', 'auth'),
  ('auth-login', 'Giriş Yap', 'auth'),
  ('auth-register', 'Kayıt Ol', 'auth'),
  ('auth-guest', 'Misafir Girişi', 'auth'),
  ('auth-forgot-password', 'Şifremi Unuttum', 'auth')
on conflict (feature_id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_feature_flags'
  ) then
    alter publication supabase_realtime add table public.app_feature_flags;
  end if;
end $$;
