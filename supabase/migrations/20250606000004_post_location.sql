-- Gönderi konum kaydı

create or replace function public.set_post_location(p_post_id uuid, lng double precision, lat double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set location = st_setsrid(st_makepoint(lng, lat), 4326)::geography
  where id = p_post_id
    and author_id = auth.uid();
end;
$$;

grant execute on function public.set_post_location(uuid, double precision, double precision) to authenticated;
