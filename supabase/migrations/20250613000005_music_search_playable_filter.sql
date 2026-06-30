-- Arama sonuçlarından sesi yüklenmemiş parçaları çıkar
create or replace function public.search_music_tracks(p_query text, p_limit integer default 30)
returns setof public.music_tracks
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.music_tracks t
  where t.publication_status = 'active'
    and t.license_status = 'licensed'
    and t.audio_url is not null
    and t.audio_url <> 'pending'
    and t.audio_url like 'http%'
    and (
      p_query is null
      or trim(p_query) = ''
      or t.display_title ilike '%' || trim(p_query) || '%'
      or t.title ilike '%' || trim(p_query) || '%'
      or t.artist ilike '%' || trim(p_query) || '%'
      or coalesce(t.album, '') ilike '%' || trim(p_query) || '%'
    )
  order by t.usage_count desc, t.sort_order asc, t.created_at desc, t.display_title asc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;
