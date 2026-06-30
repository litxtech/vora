-- Heyet: genel amaçlı oturumlar, admin üye yönetimi, zengin karar mesajı

alter type public.heyet_subject_type add value if not exists 'general';

alter table public.heyet_cases
  alter column subject_id drop not null;

alter table public.heyet_cases
  add column if not exists custom_title text;

alter table public.heyet_cases
  drop constraint if exists heyet_cases_subject_unique;

create unique index if not exists heyet_cases_subject_unique_idx
  on public.heyet_cases (subject_type, subject_id)
  where subject_id is not null;

-- ─── Genel heyet aç ─────────────────────────────────────────────────────────

create or replace function public.admin_open_general_heyet(
  p_title text,
  p_member_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_title text;
  v_conversation_id uuid;
  v_party_a uuid;
  v_party_b uuid;
  v_member_id uuid;
  v_welcome text;
  v_deep_link text;
  v_members uuid[] := array[]::uuid[];
begin
  if v_admin_id is null then
    raise exception 'Oturum gerekli';
  end if;
  if not public.is_admin() then
    raise exception 'Admin yetkisi gerekli';
  end if;

  v_title := coalesce(nullif(trim(p_title), ''), 'Heyet · Genel uyuşmazlık');
  if not (v_title ilike 'Heyet%') then
    v_title := 'Heyet · ' || v_title;
  end if;

  foreach v_member_id in array coalesce(p_member_ids, array[]::uuid[])
  loop
    if v_member_id is not null and v_member_id <> v_admin_id then
      v_members := array_append(v_members, v_member_id);
    end if;
  end loop;

  v_members := (select array_agg(distinct m) from unnest(v_members) as m);

  if coalesce(array_length(v_members, 1), 0) < 2 then
    raise exception 'En az iki taraf seçilmelidir';
  end if;

  v_party_a := v_members[1];
  v_party_b := v_members[2];

  insert into public.conversations (type, title, created_by)
  values ('group', v_title, v_admin_id)
  returning id into v_conversation_id;

  v_deep_link := '/chat/' || v_conversation_id::text;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_conversation_id, v_admin_id, 'founder')
  on conflict do nothing;

  foreach v_member_id in array v_members
  loop
    insert into public.conversation_members (conversation_id, user_id, role)
    values (v_conversation_id, v_member_id, 'member')
    on conflict do nothing;

    perform public.notify_user_system(
      v_member_id,
      'Heyet oturumu açıldı',
      v_title || ' · Vora Heyet incelemesi başladı. Sohbete katılın.',
      jsonb_build_object(
        'deep_link', v_deep_link,
        'conversation_id', v_conversation_id,
        'heyet_subject_type', 'general'
      ),
      'high',
      v_admin_id
    );
  end loop;

  insert into public.heyet_cases (
    conversation_id,
    subject_type,
    subject_id,
    party_a_id,
    party_b_id,
    opened_by,
    status,
    custom_title
  )
  values (
    v_conversation_id,
    'general',
    null,
    v_party_a,
    v_party_b,
    v_admin_id,
    'open',
    v_title
  );

  v_welcome :=
    'Vora Heyet oturumu başlatıldı. Taraflar yaşanan sorunu, kanıtları ve taleplerinizi burada paylaşabilirsiniz. '
    || 'İnceleme sonrası karar bu sohbette açıklanacaktır.';

  insert into public.messages (conversation_id, sender_id, content, message_type)
  values (v_conversation_id, v_admin_id, v_welcome, 'text');

  return v_conversation_id;
end;
$$;

-- ─── Admin üye ekle / çıkar (heyet grupları) ───────────────────────────────

create or replace function public.admin_heyet_add_members(
  p_case_id uuid,
  p_member_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.heyet_cases%rowtype;
  v_member_id uuid;
  v_added integer := 0;
  v_rows integer;
  v_deep_link text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin yetkisi gerekli';
  end if;

  select * into v_case from public.heyet_cases where id = p_case_id;
  if not found then
    raise exception 'Heyet bulunamadı';
  end if;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_case.conversation_id, auth.uid(), 'member')
  on conflict do nothing;

  v_deep_link := '/chat/' || v_case.conversation_id::text;

  foreach v_member_id in array coalesce(p_member_ids, array[]::uuid[])
  loop
    if v_member_id is not null then
      insert into public.conversation_members (conversation_id, user_id, role)
      values (v_case.conversation_id, v_member_id, 'member')
      on conflict do nothing;
      get diagnostics v_rows = row_count;
      if v_rows > 0 then
        v_added := v_added + v_rows;
        perform public.notify_user_system(
          v_member_id,
          'Heyet sohbetine eklendiniz',
          coalesce(v_case.custom_title, 'Heyet oturumu') || ' · Admin sizi heyet sohbetine dahil etti.',
          jsonb_build_object(
            'deep_link', v_deep_link,
            'conversation_id', v_case.conversation_id,
            'heyet_case_id', v_case.id
          ),
          'high',
          auth.uid()
        );
      end if;
    end if;
  end loop;

  return v_added;
end;
$$;

create or replace function public.admin_heyet_remove_member(
  p_case_id uuid,
  p_member_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.heyet_cases%rowtype;
  v_target_role public.conversation_member_role;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin yetkisi gerekli';
  end if;

  select * into v_case from public.heyet_cases where id = p_case_id;
  if not found then
    raise exception 'Heyet bulunamadı';
  end if;

  select role into v_target_role
  from public.conversation_members
  where conversation_id = v_case.conversation_id
    and user_id = p_member_id;

  if v_target_role is null then
    return false;
  end if;

  if v_target_role = 'founder' then
    raise exception 'Kurucu çıkarılamaz';
  end if;

  delete from public.conversation_members
  where conversation_id = v_case.conversation_id
    and user_id = p_member_id;

  return true;
end;
$$;

-- ─── Karar mesajı (zengin metadata) ─────────────────────────────────────────

create or replace function public.admin_post_heyet_decision(
  p_case_id uuid,
  p_decision_text text,
  p_close_after boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.heyet_cases%rowtype;
  v_decision text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin yetkisi gerekli';
  end if;

  v_decision := trim(coalesce(p_decision_text, ''));
  if length(v_decision) < 10 then
    raise exception 'Karar açıklaması en az 10 karakter olmalı';
  end if;

  select * into v_case from public.heyet_cases where id = p_case_id for update;
  if not found then
    raise exception 'Heyet bulunamadı';
  end if;

  insert into public.messages (
    conversation_id,
    sender_id,
    content,
    message_type,
    metadata
  )
  values (
    v_case.conversation_id,
    auth.uid(),
    v_decision,
    'text',
    jsonb_build_object(
      'kind', 'heyet_decision',
      'decision_text', v_decision,
      'case_id', p_case_id,
      'subject_type', v_case.subject_type,
      'closed_after', p_close_after
    )
  );

  update public.heyet_cases
  set decision_text = v_decision,
      decision_by = auth.uid(),
      decision_at = now(),
      status = case when p_close_after then 'closed'::public.heyet_status else status end,
      closed_at = case when p_close_after then now() else closed_at end
  where id = p_case_id;
end;
$$;

-- ─── Admin listesi ──────────────────────────────────────────────────────────

create or replace function public.list_admin_heyet_cases(
  p_status public.heyet_status default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin yetkisi gerekli';
  end if;

  return coalesce(
    (
      select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
      from (
        select
          hc.id,
          hc.conversation_id,
          hc.subject_type,
          hc.subject_id,
          hc.party_a_id,
          hc.party_b_id,
          hc.opened_by,
          hc.status,
          hc.decision_text,
          hc.decision_by,
          hc.decision_at,
          hc.closed_at,
          hc.created_at,
          hc.custom_title,
          pa.username as party_a_username,
          pb.username as party_b_username
        from public.heyet_cases hc
        left join public.profiles pa on pa.id = hc.party_a_id
        left join public.profiles pb on pb.id = hc.party_b_id
        where p_status is null or hc.status = p_status
        order by hc.created_at desc
        limit greatest(1, least(coalesce(p_limit, 50), 100))
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

-- ─── Sorgu JSON güncellemesi ─────────────────────────────────────────────────

create or replace function public.get_heyet_case_by_subject(
  p_subject_type public.heyet_subject_type,
  p_subject_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.heyet_cases%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin yetkisi gerekli';
  end if;

  select * into v_row
  from public.heyet_cases
  where subject_type = p_subject_type
    and subject_id = p_subject_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'conversation_id', v_row.conversation_id,
    'subject_type', v_row.subject_type,
    'subject_id', v_row.subject_id,
    'party_a_id', v_row.party_a_id,
    'party_b_id', v_row.party_b_id,
    'opened_by', v_row.opened_by,
    'status', v_row.status,
    'decision_text', v_row.decision_text,
    'decision_by', v_row.decision_by,
    'decision_at', v_row.decision_at,
    'closed_at', v_row.closed_at,
    'created_at', v_row.created_at,
    'custom_title', v_row.custom_title
  );
end;
$$;

create or replace function public.get_heyet_case_for_conversation(p_conversation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.heyet_cases%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  if not exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()
  ) and not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_row
  from public.heyet_cases
  where conversation_id = p_conversation_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'conversation_id', v_row.conversation_id,
    'subject_type', v_row.subject_type,
    'subject_id', v_row.subject_id,
    'party_a_id', v_row.party_a_id,
    'party_b_id', v_row.party_b_id,
    'opened_by', v_row.opened_by,
    'status', v_row.status,
    'decision_text', v_row.decision_text,
    'decision_by', v_row.decision_by,
    'decision_at', v_row.decision_at,
    'closed_at', v_row.closed_at,
    'created_at', v_row.created_at,
    'custom_title', v_row.custom_title
  );
end;
$$;

grant execute on function public.admin_open_general_heyet(text, uuid[]) to authenticated;
grant execute on function public.admin_heyet_add_members(uuid, uuid[]) to authenticated;
grant execute on function public.admin_heyet_remove_member(uuid, uuid) to authenticated;
grant execute on function public.list_admin_heyet_cases(public.heyet_status, integer) to authenticated;

notify pgrst, 'reload schema';
