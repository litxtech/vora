-- Yapay zekâ / kural tabanlı moderasyon logları

create table public.ai_moderation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  target_type text,
  target_id uuid,
  text_sample text,
  flags jsonb not null default '[]'::jsonb,
  score numeric(5, 3),
  action text not null check (action in ('allowed', 'blocked', 'review')),
  provider text not null default 'rules',
  created_at timestamptz not null default now()
);

create index ai_moderation_logs_user_idx on public.ai_moderation_logs (user_id, created_at desc);
create index ai_moderation_logs_target_idx on public.ai_moderation_logs (target_type, target_id);

alter table public.ai_moderation_logs enable row level security;

create policy "ai_moderation_logs_moderator_read" on public.ai_moderation_logs
  for select using (public.is_moderator());

create policy "ai_moderation_logs_self_read" on public.ai_moderation_logs
  for select using (auth.uid() = user_id);
