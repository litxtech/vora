-- Harita katmanları için genel okuma politikaları

create policy "incidents_public_read" on public.incident_reports
  for select using (true);

create policy "businesses_public_read" on public.businesses
  for select using (true);

create policy "events_public_read" on public.events
  for select using (status = 'published');

create policy "lost_items_public_read" on public.lost_items
  for select using (status = 'open');
