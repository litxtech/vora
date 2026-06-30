-- Yardım talebi güncelleme + gönüllü ekip üyelik etkileşimleri

-- Üye sayısı senkronizasyonu
create or replace function public.sync_volunteer_team_member_count()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.volunteer_teams
    set member_count = member_count + 1
    where id = new.team_id;
  elsif tg_op = 'DELETE' then
    update public.volunteer_teams
    set member_count = greatest(member_count - 1, 0)
    where id = old.team_id;
  end if;
  return null;
end;
$$;

drop trigger if exists volunteer_team_members_count_sync on public.volunteer_team_members;
create trigger volunteer_team_members_count_sync
  after insert or delete on public.volunteer_team_members
  for each row execute function public.sync_volunteer_team_member_count();

-- RLS: üyelik okuma / ayrılma
drop policy if exists volunteer_team_members_read on public.volunteer_team_members;
create policy volunteer_team_members_read on public.volunteer_team_members
  for select using (true);

drop policy if exists volunteer_team_members_delete on public.volunteer_team_members;
create policy volunteer_team_members_delete on public.volunteer_team_members
  for delete using (auth.uid() = user_id);

-- RLS: yazar talebi çözüldü işaretleyebilir
drop policy if exists help_requests_update on public.help_requests;
create policy help_requests_update on public.help_requests
  for update using (auth.uid() = author_id)
  with check (auth.uid() = author_id);
