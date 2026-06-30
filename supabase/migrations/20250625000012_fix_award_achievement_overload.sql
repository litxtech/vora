-- award_achievement(uuid, text) ile award_achievement(uuid, text, text) aynı anda vardı.
-- 2 argümanlı çağrılar (job_seekers INSERT tetikleyicisi dahil) belirsiz kalıyordu:
--   function public.award_achievement(uuid, unknown) is not unique
-- Bu da kariyer profili kaydını ve diğer başarım tetikleyicilerini kırıyordu.

drop function if exists public.award_achievement(uuid, text);

create or replace function public.on_job_seeker_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_achievement(
    new.user_id,
    'first_job_application',
    'Kariyer profili oluşturma'
  );
  return new;
end;
$$;
