-- Blog Studio: mevcut web_blog_posts genişletilir. İkinci bir blog tablosu yoktur.

alter table public.web_blog_posts drop constraint if exists web_blog_posts_status_check;
alter table public.web_blog_posts
  add constraint web_blog_posts_status_check
  check (status in ('draft', 'review', 'scheduled', 'published', 'archived', 'trash'));

alter table public.web_blog_posts add column if not exists scheduled_at timestamptz;
alter table public.web_blog_posts add column if not exists seo_canonical text;
alter table public.web_blog_posts add column if not exists seo_indexable boolean not null default true;
alter table public.web_blog_posts add column if not exists seo_score integer;
alter table public.web_blog_posts add column if not exists field_modes jsonb not null default '{}'::jsonb;
alter table public.web_blog_posts add column if not exists translation_group_id uuid;
alter table public.web_blog_posts add column if not exists search_intent text;
alter table public.web_blog_posts add column if not exists generation_source text;
alter table public.web_blog_posts add column if not exists ai_model text;
alter table public.web_blog_posts add column if not exists ai_generated_at timestamptz;
alter table public.web_blog_posts add column if not exists ai_last_action text;
alter table public.web_blog_posts add column if not exists factual_notes jsonb not null default '[]'::jsonb;
alter table public.web_blog_posts add column if not exists quality_report jsonb not null default '{}'::jsonb;

create index if not exists web_blog_posts_status_idx on public.web_blog_posts (status, updated_at desc);
create index if not exists web_blog_posts_translation_idx on public.web_blog_posts (translation_group_id);

create table if not exists public.web_blog_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.web_blog_posts (id) on delete cascade,
  snapshot jsonb not null,
  change_type text not null,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.web_ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  article_id uuid references public.web_blog_posts (id) on delete set null,
  provider text not null,
  model text,
  action text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost numeric not null default 0,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.web_blog_audit (
  id uuid primary key default gen_random_uuid(),
  article_id uuid,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.web_blog_settings (
  id integer primary key default 1 check (id = 1),
  brand_voice text not null default 'Doğal, modern, samimi ve bilgilendirici. Abartılı kurumsal dil kullanma.',
  seo_rules text not null default 'Ana konuyu doğal geçir. Anahtar kelime yığma. Sahte istatistik yazma.',
  daily_limit integer not null default 40,
  updated_at timestamptz not null default now()
);

insert into public.web_blog_settings (id) values (1) on conflict (id) do nothing;

alter table public.web_blog_revisions enable row level security;
alter table public.web_ai_generation_logs enable row level security;
alter table public.web_blog_audit enable row level security;
alter table public.web_blog_settings enable row level security;

drop policy if exists web_blog_revisions_admin on public.web_blog_revisions;
create policy web_blog_revisions_admin on public.web_blog_revisions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists web_ai_logs_admin on public.web_ai_generation_logs;
create policy web_ai_logs_admin on public.web_ai_generation_logs
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists web_blog_audit_admin on public.web_blog_audit;
create policy web_blog_audit_admin on public.web_blog_audit
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists web_blog_settings_admin on public.web_blog_settings;
create policy web_blog_settings_admin on public.web_blog_settings
  for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.web_blog_revisions to authenticated;
grant select, insert, update, delete on public.web_ai_generation_logs to authenticated;
grant select, insert, update, delete on public.web_blog_audit to authenticated;
grant select, insert, update, delete on public.web_blog_settings to authenticated;
