-- Canlar yorumları: saat, beğeni, yanıt, silme, düzenleme.
-- İlan düzenleme: metin, şehir, medya, bağış ve bağış açıklaması.

alter table public.canlar_post_comments
  add column if not exists parent_id uuid references public.canlar_post_comments (id) on delete cascade,
  add column if not exists like_count integer not null default 0,
  add column if not exists edited_at timestamptz;

create index if not exists canlar_comments_parent_idx
  on public.canlar_post_comments (parent_id);

create table if not exists public.canlar_comment_likes (
  comment_id uuid not null references public.canlar_post_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.canlar_comment_likes enable row level security;

drop function if exists public.canlar_add_comment(uuid, text);

create or replace function public.canlar_add_comment(p_post_id uuid, p_body text, p_parent uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_id uuid;
  v_vora uuid;
  v_parent_post uuid;
  v_parent_parent uuid;
  v_root uuid;
begin
  v_uid := public.canlar_require_member(false);
  select vora_post_id into v_vora from public.canlar_posts where id = p_post_id and status = 'published';
  if v_vora is not null then
    raise exception 'Bu gönderinin yorumları bağlı Vora gönderisindedir.';
  end if;
  if p_parent is not null then
    select post_id, parent_id into v_parent_post, v_parent_parent
    from public.canlar_post_comments where id = p_parent;
    if v_parent_post is null or v_parent_post <> p_post_id then
      raise exception 'Yanıt bağlanamadı.';
    end if;
    if v_parent_parent is not null then
      select parent_id into v_root from public.canlar_post_comments where id = v_parent_parent;
      if v_root is not null then
        raise exception 'Bu yoruma daha fazla yanıt yazılamaz.';
      end if;
    end if;
  end if;
  insert into public.canlar_post_comments (post_id, author_id, body, parent_id)
  values (p_post_id, v_uid, trim(p_body), p_parent)
  returning id into v_id;
  update public.canlar_posts set comment_count = comment_count + 1 where id = p_post_id;
  return v_id;
end;
$$;

create or replace function public.canlar_edit_comment(p_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.canlar_require_member(false);
  v_author uuid;
begin
  select author_id into v_author from public.canlar_post_comments where id = p_id;
  if v_author is null then
    raise exception 'Yorum bulunamadı.';
  end if;
  if v_author <> v_uid then
    raise exception 'Bu yorumu düzenleme yetkiniz yok.';
  end if;
  update public.canlar_post_comments
    set body = trim(p_body), edited_at = now()
    where id = p_id;
end;
$$;

create or replace function public.canlar_delete_comment(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.canlar_require_member(false);
  v_comment public.canlar_post_comments%rowtype;
  v_owner uuid;
  v_count integer;
begin
  select * into v_comment from public.canlar_post_comments where id = p_id;
  if not found then
    raise exception 'Yorum bulunamadı.';
  end if;
  select author_id into v_owner from public.canlar_posts where id = v_comment.post_id;
  if v_comment.author_id <> v_uid and v_owner is distinct from v_uid and not public.is_moderator() then
    raise exception 'Bu yorumu silme yetkiniz yok.';
  end if;
  with recursive doomed as (
    select id from public.canlar_post_comments where id = p_id
    union all
    select c.id from public.canlar_post_comments c join doomed d on c.parent_id = d.id
  )
  select count(*) into v_count from doomed;
  delete from public.canlar_post_comments where id = p_id;
  update public.canlar_posts
    set comment_count = greatest(comment_count - coalesce(v_count, 1), 0)
    where id = v_comment.post_id;
end;
$$;

create or replace function public.canlar_toggle_comment_like(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.canlar_require_member(false);
begin
  if not exists (select 1 from public.canlar_post_comments where id = p_id) then
    raise exception 'Yorum bulunamadı.';
  end if;
  if exists (select 1 from public.canlar_comment_likes where comment_id = p_id and user_id = v_uid) then
    delete from public.canlar_comment_likes where comment_id = p_id and user_id = v_uid;
    update public.canlar_post_comments set like_count = greatest(like_count - 1, 0) where id = p_id;
    return false;
  end if;
  insert into public.canlar_comment_likes (comment_id, user_id) values (p_id, v_uid);
  update public.canlar_post_comments set like_count = like_count + 1 where id = p_id;
  return true;
end;
$$;

drop function if exists public.canlar_open_listing_donation(uuid);

create or replace function public.canlar_open_listing_donation(p_post_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.canlar_require_member(false);
  v_post public.canlar_posts%rowtype;
  v_case uuid;
  v_campaign uuid;
  v_city text;
  v_summary text;
  v_note text;
begin
  select * into v_post from public.canlar_posts where id = p_post_id;
  if not found or v_post.status <> 'published' then
    raise exception 'İlan bulunamadı.';
  end if;
  if v_post.author_id <> v_uid and not public.is_moderator() then
    raise exception 'Bu ilana bağış butonu ekleme yetkiniz yok.';
  end if;
  if v_post.outcome is not null then
    raise exception 'Bu ilanın bağışı kapanmış.';
  end if;
  v_note := nullif(trim(coalesce(p_note, '')), '');
  if v_post.campaign_id is not null then
    perform public.canlar_open_internal();
    update public.canlar_campaigns
      set status = 'live',
          payments_enabled = true,
          budget_gap_note = coalesce(v_note, budget_gap_note),
          purpose = coalesce(v_note, purpose)
      where id = v_post.campaign_id;
    update public.canlar_posts set donation_open = true where id = p_post_id;
    return v_post.campaign_id;
  end if;

  v_city := coalesce(nullif(trim(coalesce(v_post.city_label, '')), ''), 'Belirtilmedi');
  v_summary := trim(v_post.body);
  if char_length(v_summary) < 8 then
    v_summary := rpad(v_summary, 8, '.');
  end if;

  perform public.canlar_open_internal();
  v_case := v_post.case_id;
  if v_case is null then
    insert into public.canlar_cases (
      public_code, species, summary, city_label, urgency, status, treatment_status, reporter_id, cover_url
    ) values (
      'VC-' || lpad(nextval('public.canlar_public_code_seq')::text, 6, '0'),
      'other',
      v_summary,
      v_city,
      'normal',
      'new_report',
      'unknown',
      v_uid,
      nullif(v_post.media #>> '{0,url}', '')
    ) returning id into v_case;
    insert into public.canlar_case_private (case_id) values (v_case);
    insert into public.canlar_case_events (case_id, from_status, to_status, note, is_public, actor_id)
    values (v_case, null, 'new_report', 'Bağışlı ilan açıldı.', true, v_uid);
  end if;

  insert into public.canlar_campaigns (
    case_id, owner_id, title, purpose, help_kind, payout_model, target_minor, currency,
    fulfillment_plan, proof_plan, budget_gap_note, status, payments_enabled
  ) values (
    v_case,
    v_uid,
    left(v_summary, 80),
    coalesce(v_note, v_summary),
    'treatment',
    'beneficiary',
    0,
    'try',
    'Hedef tutar yok. Gelen bağış ilanda görünür.',
    'Toplanan tutar ilanda anlık görünür.',
    coalesce(v_note, 'Açık bağış. Sabit hedef yok.'),
    'live',
    true
  ) returning id into v_campaign;

  update public.canlar_posts
    set case_id = v_case, campaign_id = v_campaign, donation_open = true
    where id = p_post_id;

  return v_campaign;
end;
$$;

create or replace function public.canlar_update_listing(
  p_post_id uuid,
  p_body text,
  p_city text,
  p_media jsonb,
  p_donation boolean,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.canlar_require_member(false);
  v_post public.canlar_posts%rowtype;
  v_body text := trim(coalesce(p_body, ''));
  v_city text := trim(coalesce(p_city, ''));
  v_summary text;
begin
  if char_length(v_body) < 1 then
    raise exception 'Paylaşım metni boş.';
  end if;
  if char_length(v_city) < 2 then
    raise exception 'Şehir eksik.';
  end if;
  select * into v_post from public.canlar_posts where id = p_post_id and status = 'published';
  if not found then
    raise exception 'İlan bulunamadı.';
  end if;
  if v_post.author_id <> v_uid and not public.is_moderator() then
    raise exception 'Bu ilanı düzenleme yetkiniz yok.';
  end if;

  update public.canlar_posts
    set body = v_body,
        city_label = v_city,
        media = coalesce(p_media, media),
        updated_at = now()
    where id = p_post_id;

  v_summary := v_body;
  if char_length(v_summary) < 8 then
    v_summary := rpad(v_summary, 8, '.');
  end if;

  if v_post.case_id is not null then
    update public.canlar_cases
      set summary = v_summary, city_label = v_city
      where id = v_post.case_id;
  end if;

  if p_donation then
    perform public.canlar_open_listing_donation(p_post_id, p_note);
  else
    update public.canlar_posts set donation_open = false where id = p_post_id;
    if v_post.campaign_id is not null then
      perform public.canlar_open_internal();
      update public.canlar_campaigns
        set payments_enabled = false
        where id = v_post.campaign_id;
    end if;
  end if;
end;
$$;

create or replace function public.canlar_post_detail(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_post public.canlar_posts%rowtype;
  v_uid uuid := auth.uid();
  v_likes integer;
  v_comments integer;
begin
  select * into v_post from public.canlar_posts where id = p_id and (status = 'published' or author_id = v_uid or public.is_moderator());
  if not found then
    return null;
  end if;
  if v_post.vora_post_id is not null then
    select like_count, comment_count into v_likes, v_comments from public.posts where id = v_post.vora_post_id;
  else
    v_likes := v_post.like_count;
    v_comments := v_post.comment_count;
  end if;
  return jsonb_build_object(
    'post', jsonb_build_object(
      'id', v_post.id,
      'body', v_post.body,
      'media', v_post.media,
      'city_label', v_post.city_label,
      'species', v_post.species,
      'urgency', v_post.urgency,
      'case_id', v_post.case_id,
      'campaign_id', v_post.campaign_id,
      'vora_post_id', v_post.vora_post_id,
      'publish_mode', v_post.publish_mode,
      'like_count', coalesce(v_likes, 0),
      'comment_count', coalesce(v_comments, 0),
      'created_at', v_post.created_at,
      'author_id', v_post.author_id,
      'author_label', (select username from public.profiles where id = v_post.author_id),
      'outcome', v_post.outcome,
      'donation_open', v_post.donation_open,
      'donation_note', (
        select budget_gap_note from public.canlar_campaigns where id = v_post.campaign_id
      )
    ),
    'can_delete', v_uid is not null and v_post.status <> 'removed' and (v_post.author_id = v_uid or public.is_moderator()),
    'liked', v_uid is not null and (
      (v_post.vora_post_id is not null and exists (
        select 1 from public.post_likes where post_id = v_post.vora_post_id and user_id = v_uid
      ))
      or exists (select 1 from public.canlar_post_likes where post_id = p_id and user_id = v_uid)
    ),
    'saved', v_uid is not null and (
      (v_post.vora_post_id is not null and exists (
        select 1 from public.post_saves where post_id = v_post.vora_post_id and user_id = v_uid
      ))
      or exists (select 1 from public.canlar_post_saves where post_id = p_id and user_id = v_uid)
    ),
    'comments', case when v_post.vora_post_id is null then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'body', c.body,
        'created_at', c.created_at,
        'edited_at', c.edited_at,
        'parent_id', c.parent_id,
        'like_count', c.like_count,
        'liked', v_uid is not null and exists (
          select 1 from public.canlar_comment_likes l where l.comment_id = c.id and l.user_id = v_uid
        ),
        'author_id', c.author_id,
        'author_label', pr.username
      ) order by c.created_at)
      from public.canlar_post_comments c
      left join public.profiles pr on pr.id = c.author_id
      where c.post_id = p_id
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

create or replace function public.canlar_listing_state(p_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'outcome', p.outcome,
    'donation_open', p.donation_open,
    'campaign_id', p.campaign_id,
    'author_id', p.author_id,
    'donation_note', (
      select c.budget_gap_note from public.canlar_campaigns c where c.id = p.campaign_id
    ),
    'raised_minor', coalesce((
      select sum(d.gross_minor - d.refunded_minor)
      from public.canlar_donations d
      where d.campaign_id = p.campaign_id and d.status in ('succeeded', 'partially_refunded')
    ), 0)
  )), '[]'::jsonb)
  from public.canlar_posts p
  where p.id = any(p_ids) and p.status = 'published';
$$;

revoke all on function public.canlar_add_comment(uuid, text, uuid) from public, anon;
grant execute on function public.canlar_add_comment(uuid, text, uuid) to authenticated;
revoke all on function public.canlar_edit_comment(uuid, text) from public, anon;
grant execute on function public.canlar_edit_comment(uuid, text) to authenticated;
revoke all on function public.canlar_delete_comment(uuid) from public, anon;
grant execute on function public.canlar_delete_comment(uuid) to authenticated;
revoke all on function public.canlar_toggle_comment_like(uuid) from public, anon;
grant execute on function public.canlar_toggle_comment_like(uuid) to authenticated;
revoke all on function public.canlar_open_listing_donation(uuid, text) from public, anon;
grant execute on function public.canlar_open_listing_donation(uuid, text) to authenticated;
revoke all on function public.canlar_update_listing(uuid, text, text, jsonb, boolean, text) from public, anon;
grant execute on function public.canlar_update_listing(uuid, text, text, jsonb, boolean, text) to authenticated;
