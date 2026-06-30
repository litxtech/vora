-- Haber doğrulama notları listesi (gönderi / reel)

create or replace function public.list_content_verification_notes(
  p_post_id uuid default null,
  p_reel_id uuid default null,
  p_limit int default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_notes jsonb;
begin
  if num_nonnulls(p_post_id, p_reel_id) <> 1 then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', nv.id,
        'reporter_id', nv.reporter_id,
        'result', nv.result,
        'note', nv.note,
        'created_at', nv.created_at,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'role', p.role
      )
      order by nv.created_at desc
    ),
    '[]'::jsonb
  )
  into v_notes
  from (
    select nv.id, nv.result, nv.note, nv.created_at, nv.reporter_id
    from public.news_verifications nv
    where
      (
        (p_post_id is not null and nv.post_id = p_post_id)
        or (p_reel_id is not null and nv.reel_id = p_reel_id)
      )
      and nv.note is not null
      and btrim(nv.note) <> ''
    order by nv.created_at desc
    limit greatest(1, least(p_limit, 50))
  ) nv
  join public.profiles p on p.id = nv.reporter_id;

  return coalesce(v_notes, '[]'::jsonb);
end;
$$;

grant execute on function public.list_content_verification_notes(uuid, uuid, int) to authenticated, anon;
