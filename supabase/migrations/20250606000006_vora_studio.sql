-- VORA Video Studio — render iş kuyruğu

create table if not exists public.vora_studio_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  source_storage_path text,
  manifest jsonb not null default '{}'::jsonb,
  ffmpeg_commands jsonb not null default '[]'::jsonb,
  output_storage_path text,
  thumbnail_storage_path text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vora_studio_jobs_user_id_idx on public.vora_studio_jobs (user_id);
create index if not exists vora_studio_jobs_status_idx on public.vora_studio_jobs (status);

alter table public.vora_studio_jobs enable row level security;

create policy vora_studio_jobs_owner_read
  on public.vora_studio_jobs for select
  using (auth.uid() = user_id);

create policy vora_studio_jobs_owner_insert
  on public.vora_studio_jobs for insert
  with check (auth.uid() = user_id);

create policy vora_studio_jobs_owner_update
  on public.vora_studio_jobs for update
  using (auth.uid() = user_id);

-- Özellik bayrağı
insert into public.app_feature_flags (feature_id, label, feature_group)
values ('vora-studio', 'VORA Video Studio', 'actions')
on conflict (feature_id) do nothing;
