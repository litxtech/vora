-- Kullanıcı hesap dondurma: yalnızca aktif hesaplardan, sunucu tarafı doğrulama ile.

create or replace function public.request_account_freeze()
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

  update public.profiles
  set
    account_status = 'frozen',
    updated_at = now()
  where id = v_user_id
    and account_status = 'active';

  if not found then
    raise exception 'Hesap dondurulamadı';
  end if;
end;
$$;

grant execute on function public.request_account_freeze() to authenticated;
