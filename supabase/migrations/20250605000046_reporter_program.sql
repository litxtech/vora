-- Bölüm 25 — Muhabir Programı: başvuru ve haber doğrulama puanlama

create type public.reporter_application_status as enum ('pending', 'approved', 'rejected');
create type public.news_verification_result as enum ('correct', 'incorrect', 'unverified');

create table public.reporter_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  motivation text not null,
  experience text,
  sample_links text[] not null default '{}',
  region_id text references public.regions (id),
  status public.reporter_application_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index reporter_applications_pending_user_idx
  on public.reporter_applications (user_id)
  where status = 'pending';

create table public.news_verifications (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  result public.news_verification_result not null,
  note text,
  score_delta integer not null,
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create index news_verifications_post_idx on public.news_verifications (post_id, created_at desc);

-- Haber doğrulama puanlama: doğru +10, yanlış -20
create or replace function public.verify_news_post(
  p_post_id uuid,
  p_reporter_id uuid,
  p_result public.news_verification_result,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta integer;
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = p_reporter_id;

  if v_role not in ('verified_reporter', 'moderator', 'admin', 'super_admin') then
    raise exception 'Muhabir yetkisi gerekli';
  end if;

  v_delta := case p_result
    when 'correct' then 10
    when 'incorrect' then -20
    else 0
  end;

  insert into public.news_verifications (post_id, reporter_id, result, note, score_delta)
  values (p_post_id, p_reporter_id, p_result, p_note, v_delta)
  on conflict (post_id, reporter_id) do update
  set result = excluded.result,
      note = excluded.note,
      score_delta = excluded.score_delta,
      created_at = now();

  if v_delta <> 0 then
    perform public.adjust_trust_score(p_reporter_id, v_delta);
    if v_delta > 0 then
      perform public.adjust_contribution_score(p_reporter_id, v_delta);
    end if;
  end if;
end;
$$;

-- Başvuru onayında verified_reporter rolü ver
create or replace function public.review_reporter_application(
  p_application_id uuid,
  p_reviewer_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.reporter_applications%rowtype;
  v_reviewer_role public.user_role;
begin
  select role into v_reviewer_role from public.profiles where id = p_reviewer_id;

  if v_reviewer_role not in ('admin', 'super_admin', 'moderator') then
    raise exception 'Yetkisiz';
  end if;

  select * into v_app from public.reporter_applications where id = p_application_id;

  if not found or v_app.status <> 'pending' then
    raise exception 'Başvuru bulunamadı veya zaten işlendi';
  end if;

  update public.reporter_applications
  set
    status = case when p_approve then 'approved'::public.reporter_application_status else 'rejected'::public.reporter_application_status end,
    reviewed_by = p_reviewer_id,
    review_note = p_note,
    reviewed_at = now()
  where id = p_application_id;

  if p_approve then
    update public.profiles
    set role = 'verified_reporter', updated_at = now()
    where id = v_app.user_id;

    insert into public.user_badges (user_id, badge_type)
    values (v_app.user_id, 'reporter')
    on conflict do nothing;

    perform public.adjust_contribution_score(v_app.user_id, 25);
  end if;
end;
$$;

alter table public.reporter_applications enable row level security;
alter table public.news_verifications enable row level security;

create policy "reporter_applications_self_read" on public.reporter_applications
  for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin', 'moderator')
  ));

create policy "reporter_applications_self_insert" on public.reporter_applications
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "news_verifications_read" on public.news_verifications
  for select to authenticated using (true);

grant execute on function public.verify_news_post(uuid, uuid, public.news_verification_result, text) to authenticated;
grant execute on function public.review_reporter_application(uuid, uuid, boolean, text) to authenticated;
