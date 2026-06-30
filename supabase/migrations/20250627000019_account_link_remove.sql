-- Hesap bağlantısını kesme ve bekleyen isteği iptal etme

create or replace function public.remove_account_link()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_deleted int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.linked_accounts
  where personal_user_id = v_uid or business_user_id = v_uid;

  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'link not found';
  end if;
end;
$$;

create or replace function public.cancel_account_link_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_updated int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  update public.account_link_requests
  set status = 'cancelled', responded_at = now()
  where id = p_request_id
    and requester_id = v_uid
    and status = 'pending'
    and expires_at > now();

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'request not found';
  end if;
end;
$$;

revoke all on function public.remove_account_link() from public;
grant execute on function public.remove_account_link() to authenticated;

revoke all on function public.cancel_account_link_request(uuid) from public;
grant execute on function public.cancel_account_link_request(uuid) to authenticated;
