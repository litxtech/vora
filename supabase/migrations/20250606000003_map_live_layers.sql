-- Harita canlı katmanları: trafik, nöbetçi, turizm için lat/lng kolonları

alter table public.traffic_reports
  add column if not exists latitude double precision generated always as (st_y(location::geometry)) stored,
  add column if not exists longitude double precision generated always as (st_x(location::geometry)) stored;

alter table public.on_duty_listings
  add column if not exists latitude double precision generated always as (st_y(location::geometry)) stored,
  add column if not exists longitude double precision generated always as (st_x(location::geometry)) stored;

alter table public.tourism_places
  add column if not exists latitude double precision generated always as (st_y(location::geometry)) stored,
  add column if not exists longitude double precision generated always as (st_x(location::geometry)) stored;
