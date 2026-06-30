-- Kuru görev ödül tipi (tasks migration atlanmışsa enum'u oluşturur)

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'task_reward_type'
  ) then
    create type public.task_reward_type as enum (
      'points',
      'badge',
      'premium_days',
      'achievement',
      'kuru'
    );
  else
    alter type public.task_reward_type add value if not exists 'kuru';
  end if;
end $$;
