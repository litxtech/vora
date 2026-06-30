-- Takipçi kaldırma: profil sahibi, kendisini takip eden bir kullanıcının takibini
-- kaldırabilir. RLS yalnızca follower_id sahibinin silmesine izin verdiği için
-- security definer RPC ile, çağıran kullanıcının following_id olduğu doğrulanır.

create or replace function public.remove_follower(p_follower_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Oturum bulunamadı';
  end if;

  if p_follower_id is null or p_follower_id = v_user_id then
    raise exception 'Geçersiz takipçi';
  end if;

  delete from public.follows
  where follower_id = p_follower_id
    and following_id = v_user_id;
end;
$$;

grant execute on function public.remove_follower(uuid) to authenticated;
