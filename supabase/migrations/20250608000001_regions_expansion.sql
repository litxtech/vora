-- Karadeniz bölgeleri — 18 il

insert into public.regions (id, name, phase) values
  ('amasya', 'Amasya', 3),
  ('artvin', 'Artvin', 1),
  ('bartin', 'Bartın', 3),
  ('bayburt', 'Bayburt', 3),
  ('bolu', 'Bolu', 3),
  ('corum', 'Çorum', 3),
  ('duzce', 'Düzce', 3),
  ('giresun', 'Giresun', 1),
  ('gumushane', 'Gümüşhane', 3),
  ('karabuk', 'Karabük', 3),
  ('kastamonu', 'Kastamonu', 3),
  ('ordu', 'Ordu', 2),
  ('rize', 'Rize', 1),
  ('samsun', 'Samsun', 2),
  ('sinop', 'Sinop', 3),
  ('tokat', 'Tokat', 3),
  ('trabzon', 'Trabzon', 1),
  ('zonguldak', 'Zonguldak', 3)
on conflict (id) do update set
  name = excluded.name,
  phase = excluded.phase;
