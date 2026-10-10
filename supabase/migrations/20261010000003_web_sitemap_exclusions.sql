-- Admin, public sitemap adresini XML'den çıkarabilir. Sayfa silinmez.

create table if not exists public.web_sitemap_exclusions (
  path text primary key,
  created_at timestamptz not null default now(),
  check (path ~ '^/'),
  check (char_length(path) between 1 and 200)
);

alter table public.web_sitemap_exclusions enable row level security;

drop policy if exists web_sitemap_exclusions_read on public.web_sitemap_exclusions;
create policy web_sitemap_exclusions_read on public.web_sitemap_exclusions
  for select using (true);

drop policy if exists web_sitemap_exclusions_admin on public.web_sitemap_exclusions;
create policy web_sitemap_exclusions_admin on public.web_sitemap_exclusions
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.web_sitemap_exclusions to anon, authenticated;
grant select, insert, update, delete on public.web_sitemap_exclusions to authenticated;
