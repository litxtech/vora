-- Vora City Governance — Phase 1: regions genişletmesi + config + feature flags

alter table public.regions add column if not exists slug text;
alter table public.regions add column if not exists country_code text not null default 'TR';
alter table public.regions add column if not exists region_label text not null default 'Karadeniz';
alter table public.regions add column if not exists latitude numeric;
alter table public.regions add column if not exists longitude numeric;
alter table public.regions add column if not exists cover_image_url text;
alter table public.regions add column if not exists icon_url text;
alter table public.regions add column if not exists description text;
alter table public.regions add column if not exists member_count integer not null default 0;
alter table public.regions add column if not exists active_count integer not null default 0;
alter table public.regions add column if not exists governance_status text not null default 'active';

update public.regions
set
  slug = coalesce(slug, id),
  governance_status = case
    when phase = 1 then 'active'
    when phase = 2 then 'active'
    else coalesce(governance_status, 'coming_soon')
  end
where slug is null or governance_status is null;

alter table public.regions
  drop constraint if exists regions_governance_status_check;

alter table public.regions
  add constraint regions_governance_status_check
  check (governance_status in ('active', 'passive', 'coming_soon'));

create unique index if not exists regions_slug_unique_idx
  on public.regions (slug)
  where slug is not null;

insert into public.app_system_config (key, value)
values (
  'city_governance',
  '{
    "leader_term_days": 30,
    "council_size": 6,
    "proposal_support_threshold": 50,
    "leader_call_rate_limit_per_hour": 3,
    "election_min_account_age_days": 7,
    "election_min_membership_days": 3,
    "enabled_region_ids": ["trabzon", "rize", "giresun", "ordu", "samsun", "artvin", "gumushane"],
    "feature_flags": {
      "elections": false,
      "council": false,
      "diplomacy": false,
      "joint_voice_rooms": false
    }
  }'::jsonb
)
on conflict (key) do nothing;

insert into public.app_feature_flags (feature_id, label, feature_group, is_button_visible)
values
  ('city-system', 'Şehir Sistemi', 'social', false),
  ('city-elections', 'Şehir Seçimleri', 'social', false),
  ('city-council', 'Şehir Meclisi', 'social', false),
  ('city-diplomacy', 'Şehir Diplomasisi', 'social', false),
  ('city-voice-rooms', 'Şehir Sesli Odaları', 'social', false)
on conflict (feature_id) do update
  set label = excluded.label,
      feature_group = excluded.feature_group;
