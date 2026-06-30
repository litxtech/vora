-- Personel talebi: sahip okuma/kaldırma

drop policy if exists "staff_requests_author_read_own" on public.staff_requests;
create policy "staff_requests_author_read_own" on public.staff_requests
  for select using (auth.uid() = author_id);

drop policy if exists "staff_requests_author_update" on public.staff_requests;
create policy "staff_requests_author_update" on public.staff_requests
  for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create or replace function public.remove_own_staff_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Giriş yapmanız gerekiyor.');
  end if;

  update public.staff_requests
  set status = 'removed'
  where id = p_request_id
    and author_id = auth.uid()
    and status in ('published', 'draft', 'hidden');

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return jsonb_build_object('error', 'Talep bulunamadı veya kaldırma yetkiniz yok.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.remove_own_staff_request(uuid) to authenticated;
