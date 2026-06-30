-- PL/pgSQL sözdizimi düzeltmesi:
-- CASE ifadesi (atama) → "end;"
-- CASE bloğu (statement) → "end case;"

create or replace function public.resolve_report_target_user(p_target_type text, p_target_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  case p_target_type
    when 'profile' then return p_target_id;
    when 'post' then
      select author_id into v_user_id from public.posts where id = p_target_id;
      return v_user_id;
    when 'comment' then
      select author_id into v_user_id from public.post_comments where id = p_target_id;
      return v_user_id;
    else return null;
  end case;
end;
$$;

create or replace function public.on_content_reported_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_penalty int;
begin
  v_user_id := public.resolve_report_target_user(new.target_type, new.target_id);
  if v_user_id is null or v_user_id = new.reporter_id then
    return new;
  end if;

  v_penalty := case new.reason
    when 'spam' then -5
    when 'misinformation' then -15
    when 'child_safety' then -20
    when 'harassment' then -10
    when 'fraud' then -10
    when 'abuse' then -10
    when 'violence' then -10
    else -5
  end;

  perform public.adjust_trust_score(v_user_id, v_penalty);
  return new;
end;
$$;

create or replace function public.on_moderation_action_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_penalty int;
begin
  v_user_id := public.resolve_moderation_target_user(new.target_type, new.target_id);
  if v_user_id is null then
    return new;
  end if;

  v_penalty := case new.action
    when 'warn' then -10
    when 'hide' then -20
    when 'remove' then -30
    when 'ban' then -100
    else -10
  end;

  perform public.adjust_trust_score(v_user_id, v_penalty);
  return new;
end;
$$;
