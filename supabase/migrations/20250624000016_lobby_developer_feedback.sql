-- Lobi: giriş öncesi geliştirici öneri / şikayet formu

create table if not exists public.lobby_developer_feedback (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  phone text check (phone is null or char_length(trim(phone)) between 7 and 24),
  email text check (email is null or char_length(trim(email)) between 5 and 254),
  message text not null check (char_length(trim(message)) between 10 and 2000),
  status text not null default 'new' check (status in ('new', 'reviewed', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists lobby_developer_feedback_status_idx
  on public.lobby_developer_feedback (status, created_at desc);

alter table public.lobby_developer_feedback enable row level security;

drop policy if exists lobby_developer_feedback_admin_read on public.lobby_developer_feedback;
create policy lobby_developer_feedback_admin_read on public.lobby_developer_feedback
  for select to authenticated
  using (public.is_moderator());

create or replace function public.submit_lobby_developer_feedback(
  p_full_name text,
  p_message text,
  p_phone text default null,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := trim(p_full_name);
  v_message text := trim(p_message);
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_email text := nullif(trim(coalesce(p_email, '')), '');
begin
  if char_length(v_name) < 2 then
    raise exception 'Ad soyad en az 2 karakter olmalıdır';
  end if;

  if char_length(v_message) < 10 then
    raise exception 'Mesaj en az 10 karakter olmalıdır';
  end if;

  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Geçerli bir e-posta girin veya alanı boş bırakın';
  end if;

  insert into public.lobby_developer_feedback (full_name, phone, email, message)
  values (v_name, v_phone, v_email, v_message)
  returning id into v_id;

  perform public.notify_admins_account_lifecycle(
    'Lobi öneri / destek',
    v_name || ': ' || left(v_message, 120),
    jsonb_build_object('kind', 'lobby_developer_feedback', 'feedback_id', v_id)
  );

  return v_id;
end;
$$;

grant execute on function public.submit_lobby_developer_feedback(text, text, text, text) to anon, authenticated;
