-- Haber doğrulama: reel desteği, özet RPC ve topluluk oyu

alter table public.news_verifications
  alter column post_id drop not null;

alter table public.news_verifications
  add column if not exists reel_id uuid references public.reels (id) on delete cascade;

alter table public.news_verifications
  drop constraint if exists news_verifications_post_id_reporter_id_key;

create unique index if not exists news_verifications_post_reporter_uq
  on public.news_verifications (post_id, reporter_id)
  where post_id is not null;

create unique index if not exists news_verifications_reel_reporter_uq
  on public.news_verifications (reel_id, reporter_id)
  where reel_id is not null;

alter table public.news_verifications
  drop constraint if exists news_verifications_target_chk;

alter table public.news_verifications
  add constraint news_verifications_target_chk
  check (num_nonnulls(post_id, reel_id) = 1);

create index if not exists news_verifications_reel_idx
  on public.news_verifications (reel_id, created_at desc)
  where reel_id is not null;

-- Muhabir doğrulaması (gönderi veya reel)
create or replace function public.verify_content(
  p_reporter_id uuid,
  p_result public.news_verification_result,
  p_note text default null,
  p_post_id uuid default null,
  p_reel_id uuid default null
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
  if num_nonnulls(p_post_id, p_reel_id) <> 1 then
    raise exception 'post_id veya reel_id gerekli';
  end if;

  select role into v_role from public.profiles where id = p_reporter_id;

  if v_role not in ('verified_reporter', 'moderator', 'admin', 'super_admin') then
    raise exception 'Muhabir yetkisi gerekli';
  end if;

  v_delta := case p_result
    when 'correct' then 10
    when 'incorrect' then -20
    else 0
  end;

  if p_post_id is not null then
    update public.news_verifications
    set result = p_result, note = p_note, score_delta = v_delta, created_at = now()
    where post_id = p_post_id and reporter_id = p_reporter_id;

    if not found then
      insert into public.news_verifications (post_id, reporter_id, result, note, score_delta)
      values (p_post_id, p_reporter_id, p_result, p_note, v_delta);
    end if;
  else
    update public.news_verifications
    set result = p_result, note = p_note, score_delta = v_delta, created_at = now()
    where reel_id = p_reel_id and reporter_id = p_reporter_id;

    if not found then
      insert into public.news_verifications (reel_id, reporter_id, result, note, score_delta)
      values (p_reel_id, p_reporter_id, p_result, p_note, v_delta);
    end if;
  end if;

  if v_delta <> 0 then
    perform public.adjust_trust_score(p_reporter_id, v_delta);
    if v_delta > 0 then
      perform public.adjust_contribution_score(p_reporter_id, v_delta);
    end if;
  end if;
end;
$$;

-- Geriye dönük uyumluluk
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
begin
  perform public.verify_content(p_reporter_id, p_result, p_note, p_post_id, null);
end;
$$;

-- Topluluk oyu (güven puanı 70+ veya muhabir/moderatör)
create or replace function public.cast_verification_vote(
  p_voter_id uuid,
  p_vote public.verification_vote,
  p_region_id text,
  p_post_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_verification_id uuid;
  v_old_vote public.verification_vote;
begin
  if p_post_id is null then
    raise exception 'Topluluk oyu yalnızca gönderiler için';
  end if;

  if not public.can_vote_verification(p_voter_id) then
    raise exception 'Oy verme yetkisi yok';
  end if;

  insert into public.post_verifications (post_id, region_id)
  values (p_post_id, p_region_id)
  on conflict (post_id) do nothing;

  select id into v_verification_id
  from public.post_verifications
  where post_id = p_post_id;

  select vote into v_old_vote
  from public.post_verification_votes
  where verification_id = v_verification_id and voter_id = p_voter_id;

  insert into public.post_verification_votes (verification_id, voter_id, vote)
  values (v_verification_id, p_voter_id, p_vote)
  on conflict (verification_id, voter_id) do update
  set vote = excluded.vote,
      created_at = now();

  if v_old_vote is not null and v_old_vote <> p_vote then
    update public.post_verifications
    set
      verified_votes = verified_votes
        - case when v_old_vote = 'verified' then 1 else 0 end
        + case when p_vote = 'verified' then 1 else 0 end,
      misinfo_votes = misinfo_votes
        - case when v_old_vote = 'misinfo' then 1 else 0 end
        + case when p_vote = 'misinfo' then 1 else 0 end,
      reviewing_votes = reviewing_votes
        - case when v_old_vote = 'reviewing' then 1 else 0 end
        + case when p_vote = 'reviewing' then 1 else 0 end,
      updated_at = now()
    where id = v_verification_id;
  elsif v_old_vote is null then
    update public.post_verifications
    set
      verified_votes = verified_votes + case when p_vote = 'verified' then 1 else 0 end,
      misinfo_votes = misinfo_votes + case when p_vote = 'misinfo' then 1 else 0 end,
      reviewing_votes = reviewing_votes + case when p_vote = 'reviewing' then 1 else 0 end,
      updated_at = now()
    where id = v_verification_id;
  end if;

  update public.post_verifications
  set status = case
    when verified_votes > misinfo_votes and verified_votes >= reviewing_votes then 'verified'::public.verification_status
    when misinfo_votes > verified_votes and misinfo_votes >= reviewing_votes then 'misinfo'::public.verification_status
    else 'reviewing'::public.verification_status
  end
  where id = v_verification_id;
end;
$$;

-- Özet (gösterge için)
create or replace function public.get_content_verification_summary(
  p_post_id uuid default null,
  p_reel_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_correct integer := 0;
  v_incorrect integer := 0;
  v_unverified integer := 0;
  v_latest_note text;
  v_latest_reporter text;
  v_community public.post_verifications%rowtype;
  v_status text := 'none';
begin
  if num_nonnulls(p_post_id, p_reel_id) <> 1 then
    return jsonb_build_object('status', 'none');
  end if;

  if p_post_id is not null then
    select
      count(*) filter (where result = 'correct'),
      count(*) filter (where result = 'incorrect'),
      count(*) filter (where result = 'unverified')
    into v_correct, v_incorrect, v_unverified
    from public.news_verifications
    where post_id = p_post_id;

    select nv.note, p.username
    into v_latest_note, v_latest_reporter
    from public.news_verifications nv
    join public.profiles p on p.id = nv.reporter_id
    where nv.post_id = p_post_id and nv.note is not null and btrim(nv.note) <> ''
    order by nv.created_at desc
    limit 1;

    select * into v_community
    from public.post_verifications
    where post_id = p_post_id;
  else
    select
      count(*) filter (where result = 'correct'),
      count(*) filter (where result = 'incorrect'),
      count(*) filter (where result = 'unverified')
    into v_correct, v_incorrect, v_unverified
    from public.news_verifications
    where reel_id = p_reel_id;

    select nv.note, p.username
    into v_latest_note, v_latest_reporter
    from public.news_verifications nv
    join public.profiles p on p.id = nv.reporter_id
    where nv.reel_id = p_reel_id and nv.note is not null and btrim(nv.note) <> ''
    order by nv.created_at desc
    limit 1;
  end if;

  if v_community.id is not null then
    v_status := v_community.status::text;
  elsif v_correct > v_incorrect and v_correct > 0 then
    v_status := 'verified';
  elsif v_incorrect > v_correct and v_incorrect > 0 then
    v_status := 'misinfo';
  elsif v_correct + v_incorrect + v_unverified > 0 then
    v_status := 'reviewing';
  else
    v_status := 'none';
  end if;

  return jsonb_build_object(
    'status', v_status,
    'correct_count', v_correct,
    'incorrect_count', v_incorrect,
    'unverified_count', v_unverified,
    'verified_votes', coalesce(v_community.verified_votes, 0),
    'misinfo_votes', coalesce(v_community.misinfo_votes, 0),
    'reviewing_votes', coalesce(v_community.reviewing_votes, 0),
    'latest_note', v_latest_note,
    'latest_reporter', v_latest_reporter
  );
end;
$$;

grant execute on function public.verify_content(uuid, public.news_verification_result, text, uuid, uuid) to authenticated;
grant execute on function public.cast_verification_vote(uuid, public.verification_vote, text, uuid) to authenticated;
grant execute on function public.get_content_verification_summary(uuid, uuid) to authenticated, anon;

create policy post_verification_votes_read on public.post_verification_votes
  for select using (true);
