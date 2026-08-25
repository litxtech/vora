-- Admin: silinmiş hesapları yeniden açma (account_status = deleted)

create or replace function public.admin_reactivate_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_status text;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz işlem';
  end if;

  select account_status into v_previous_status
  from public.profiles
  where id = p_user_id;

  if v_previous_status is null then
    raise exception 'Kullanıcı bulunamadı';
  end if;

  if v_previous_status not in ('frozen', 'deletion_pending', 'deleted') then
    raise exception 'Hesap yeniden açılamaz (durum: %)', v_previous_status;
  end if;

  update public.profiles
  set
    account_status = 'active',
    deletion_requested_at = null,
    deleted_at = null,
    deleted_by = null,
    updated_at = now()
  where id = p_user_id
    and account_status in ('frozen', 'deletion_pending', 'deleted');

  if not found then
    return;
  end if;

  update public.user_bans
  set is_active = false, lifted_at = now(), lifted_by = auth.uid()
  where user_id = p_user_id and is_active = true;

  perform public.notify_user_account_reactivated(
    p_user_id,
    case
      when v_previous_status = 'deleted' then 'Hesabınız yeniden açıldı'
      else 'Hesabınız aktif edildi'
    end,
    case
      when v_previous_status = 'deleted' then
        'Silinen hesabınız yönetici tarafından yeniden açıldı. Giriş yapıp profilinizi güncelleyebilirsiniz.'
      else
        'Hesabınız yeniden etkinleştirildi. Uygulamaya tekrar giriş yapabilirsiniz.'
    end,
    jsonb_build_object(
      'previous_status', v_previous_status,
      'source', 'admin_reactivate'
    )
  );
end;
$$;

grant execute on function public.admin_reactivate_account(uuid) to authenticated;
