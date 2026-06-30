-- Uygulama özellik görünürlüğü — admin buton gizleme (tüm kullanıcılar için geçerli)

create table if not exists public.app_feature_flags (
  feature_id text primary key,
  label text not null,
  feature_group text not null,
  is_button_visible boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.app_feature_flags enable row level security;

-- Herkes okuyabilir (misafir dahil)
create policy app_feature_flags_read
  on public.app_feature_flags for select
  using (true);

-- Yalnızca admin güncelleyebilir
create policy app_feature_flags_admin_write
  on public.app_feature_flags for all
  using (public.is_admin())
  with check (public.is_admin());

-- Başlangıç kayıtları (registry ile senkron tutulmalı)
insert into public.app_feature_flags (feature_id, label, feature_group) values
  ('feed', 'Akış', 'tabs'),
  ('discover', 'Keşfet', 'tabs'),
  ('map', 'Harita', 'tabs'),
  ('reels', 'Reels', 'tabs'),
  ('messages', 'Mesajlar', 'tabs'),
  ('profile', 'Profil', 'tabs'),
  ('personnel-center', 'Personel Merkezi', 'centers'),
  ('event-center', 'Etkinlik Merkezi', 'centers'),
  ('lost-center', 'Kayıp Merkezi', 'centers'),
  ('centers-hub', 'Tüm Merkezler', 'centers'),
  ('verification', 'Doğrulama Merkezi', 'centers'),
  ('traffic', 'Canlı Trafik Merkezi', 'centers'),
  ('duty', 'Nöbetçi Merkezi', 'centers'),
  ('price', 'Fiyat Takip Merkezi', 'centers'),
  ('tourism', 'Turizm Merkezi', 'centers'),
  ('delivery', 'Kargo & Teslimat', 'centers'),
  ('poll', 'Anket Merkezi', 'centers'),
  ('city-score', 'Şehir Puanı', 'centers'),
  ('help', 'Yardımlaşma Merkezi', 'centers'),
  ('volunteer', 'Gönüllü Ekipler', 'centers'),
  ('nearby', 'Yakınımda Ne Var', 'centers'),
  ('daily', 'Günlük Şehir Özeti', 'centers'),
  ('vora-tv', 'Vora TV', 'centers'),
  ('tip-line', 'İhbar Hattı', 'centers'),
  ('deals', 'Yerel Fırsatlar', 'centers'),
  ('reporter', 'Muhabir Programı', 'programs'),
  ('tasks', 'Günlük Görevler', 'programs'),
  ('premium', 'Premium Üyelik', 'programs'),
  ('job-seeker', 'İş Arıyorum Profili', 'programs'),
  ('settings', 'Ayarlar', 'programs'),
  ('communities', 'Topluluklar', 'social'),
  ('channels', 'Kanallar', 'social'),
  ('ads', 'Reklam Paneli', 'social'),
  ('compose', 'Gönderi Oluştur', 'actions'),
  ('calls', 'Sesli / Görüntülü Arama', 'actions'),
  ('notifications', 'Bildirimler', 'actions'),
  ('vcts', 'VORA Doğrulama (VCTS)', 'actions')
on conflict (feature_id) do nothing;
