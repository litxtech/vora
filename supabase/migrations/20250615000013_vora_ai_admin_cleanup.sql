-- Admin: AI persona ve gönderi toplu / tekil silme

create or replace function public._vora_assert_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;
end;
$$;

create or replace function public._vora_purge_persona_content(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_posts int := 0;
  v_comments int := 0;
  v_likes int := 0;
begin
  delete from public.post_likes where user_id = p_profile_id;
  get diagnostics v_likes = row_count;

  delete from public.post_comments where author_id = p_profile_id;
  get diagnostics v_comments = row_count;

  delete from public.posts where author_id = p_profile_id;
  get diagnostics v_posts = row_count;

  update public.ai_personas
  set post_count = 0, last_post_at = null, updated_at = now()
  where profile_id = p_profile_id;

  return jsonb_build_object(
    'posts_deleted', v_posts,
    'comments_deleted', v_comments,
    'likes_deleted', v_likes
  );
end;
$$;

create or replace function public._vora_delete_persona_account(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = auth, public, extensions
as $$
begin
  if not exists (select 1 from public.ai_personas where profile_id = p_profile_id) then
    raise exception 'AI persona profili bulunamadı';
  end if;

  perform public._vora_purge_persona_content(p_profile_id);

  delete from public.follows
  where follower_id = p_profile_id or following_id = p_profile_id;

  delete from public.ai_personas where profile_id = p_profile_id;
  delete from public.profiles where id = p_profile_id;
  delete from auth.users where id = p_profile_id;
end;
$$;

create or replace function public.admin_ai_persona_content_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'personas_total', (select count(*)::int from public.ai_personas),
    'personas_active', (select count(*)::int from public.ai_personas where enabled),
    'posts_total', (
      select count(*)::int
      from public.posts po
      where po.author_id in (select profile_id from public.ai_personas)
    ),
    'comments_total', (
      select count(*)::int
      from public.post_comments pc
      where pc.author_id in (select profile_id from public.ai_personas)
    )
  );
$$;

create or replace function public.admin_delete_ai_persona_posts(p_persona_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_result jsonb := '{}'::jsonb;
  v_agg jsonb := jsonb_build_object('posts_deleted', 0, 'comments_deleted', 0, 'likes_deleted', 0);
  v_row record;
  v_part jsonb;
begin
  perform public._vora_assert_admin();

  if p_persona_id is not null then
    select profile_id into v_profile_id
    from public.ai_personas
    where id = p_persona_id;

    if v_profile_id is null then
      raise exception 'Persona bulunamadı';
    end if;

    v_result := public._vora_purge_persona_content(v_profile_id);
    return v_result || jsonb_build_object('personas_affected', 1);
  end if;

  for v_row in select profile_id from public.ai_personas loop
    v_part := public._vora_purge_persona_content(v_row.profile_id);
    v_agg := jsonb_build_object(
      'posts_deleted', (v_agg->>'posts_deleted')::int + coalesce((v_part->>'posts_deleted')::int, 0),
      'comments_deleted', (v_agg->>'comments_deleted')::int + coalesce((v_part->>'comments_deleted')::int, 0),
      'likes_deleted', (v_agg->>'likes_deleted')::int + coalesce((v_part->>'likes_deleted')::int, 0)
    );
  end loop;

  return v_agg || jsonb_build_object(
    'personas_affected', (select count(*)::int from public.ai_personas)
  );
end;
$$;

create or replace function public.admin_delete_ai_persona(p_persona_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = auth, public, extensions
as $$
declare
  v_profile_id uuid;
  v_display_name text;
begin
  perform public._vora_assert_admin();

  select profile_id, display_name
  into v_profile_id, v_display_name
  from public.ai_personas
  where id = p_persona_id;

  if v_profile_id is null then
    raise exception 'Persona bulunamadı';
  end if;

  perform public._vora_delete_persona_account(v_profile_id);

  return jsonb_build_object(
    'ok', true,
    'persona_id', p_persona_id,
    'display_name', v_display_name
  );
end;
$$;

create or replace function public.admin_delete_all_ai_personas()
returns jsonb
language plpgsql
security definer
set search_path = auth, public, extensions
as $$
declare
  v_row record;
  v_deleted int := 0;
begin
  perform public._vora_assert_admin();

  for v_row in select profile_id from public.ai_personas loop
    perform public._vora_delete_persona_account(v_row.profile_id);
    v_deleted := v_deleted + 1;
  end loop;

  return jsonb_build_object('ok', true, 'personas_deleted', v_deleted);
end;
$$;

grant execute on function public.admin_ai_persona_content_stats() to authenticated;
grant execute on function public.admin_delete_ai_persona_posts(uuid) to authenticated;
grant execute on function public.admin_delete_ai_persona(uuid) to authenticated;
grant execute on function public.admin_delete_all_ai_personas() to authenticated;

grant execute on function public.admin_ai_persona_content_stats() to service_role;
grant execute on function public.admin_delete_ai_persona_posts(uuid) to service_role;
grant execute on function public.admin_delete_ai_persona(uuid) to service_role;
grant execute on function public.admin_delete_all_ai_personas() to service_role;
