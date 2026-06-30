-- Günlük görev oluşturma

create or replace function public.admin_create_daily_task(
  p_key text,
  p_title text,
  p_description text,
  p_target_count int,
  p_reward_type public.task_reward_type,
  p_reward_value int,
  p_reward_key text default null,
  p_sort_order int default 99
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  insert into public.daily_task_definitions (
    key, title, description, target_count, reward_type, reward_value, reward_key, sort_order, is_active
  )
  values (
    p_key, p_title, p_description, p_target_count, p_reward_type, p_reward_value, p_reward_key, p_sort_order, true
  );
end; $$;

grant execute on function public.admin_create_daily_task(text, text, text, int, public.task_reward_type, int, text, int) to authenticated;
