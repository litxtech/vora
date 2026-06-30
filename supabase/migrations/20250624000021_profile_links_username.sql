-- Sosyal medya kullanıcı adı + isteğe bağlı özel URL

alter table public.profile_links
  add column if not exists username text,
  add column if not exists use_custom_url boolean not null default false;

alter table public.profile_links
  drop constraint if exists profile_links_username_length;

alter table public.profile_links
  add constraint profile_links_username_length check (
    username is null or char_length(trim(username)) between 1 and 120
  );

alter table public.profile_links
  drop constraint if exists profile_links_social_username_or_custom;

alter table public.profile_links
  add constraint profile_links_social_username_or_custom check (
    kind = 'website'
    or use_custom_url = true
    or (username is not null and char_length(trim(username)) > 0)
  );
