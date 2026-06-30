-- İhbar hattı kategorileri: kaçak yapı kaldırıldı, yeni ihbar türleri eklendi
-- Idempotent: yarım kalan migration ve temiz kurulumda güvenle çalışır.

drop function if exists public.admin_list_anonymous_tips(public.tip_moderation_status, integer);

do $$
begin
  -- Henüz migrate edilmemiş eski enum (illegal_building içeriyor)
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'tip_category'
      and e.enumlabel = 'illegal_building'
  ) then
    update public.anonymous_tips
    set category = 'other'
    where category::text = 'illegal_building';

    alter type public.tip_category rename to tip_category_old;

    create type public.tip_category as enum (
      'pollution',
      'road_issue',
      'irregular_migration',
      'foreign_national_issue',
      'public_disorder',
      'drug_activity',
      'other'
    );

    alter table public.anonymous_tips
      alter column category type public.tip_category
      using (
        case category::text
          when 'pollution' then 'pollution'::public.tip_category
          when 'road_issue' then 'road_issue'::public.tip_category
          when 'other' then 'other'::public.tip_category
          else 'other'::public.tip_category
        end
      );

    drop type public.tip_category_old;

  -- Yarım migration: yeni enum + kolon hazır, eski tip kaldı
  elsif exists (select 1 from pg_type where typname = 'tip_category_old') then
    drop type public.tip_category_old;
  end if;
end $$;

create or replace function public.admin_list_anonymous_tips(
  p_status public.tip_moderation_status default 'pending',
  p_limit int default 50
)
returns table (
  id uuid,
  region_id text,
  category public.tip_category,
  description text,
  moderation_status public.tip_moderation_status,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select t.id, t.region_id, t.category, t.description, t.moderation_status, t.created_at
  from public.anonymous_tips t
  where p_status is null or t.moderation_status = p_status
  order by t.created_at desc
  limit p_limit;
end;
$$;

grant execute on function public.admin_list_anonymous_tips(public.tip_moderation_status, int) to authenticated;
