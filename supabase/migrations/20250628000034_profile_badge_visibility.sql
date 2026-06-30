-- Profil tik/rozet görünürlüğü
-- Kullanıcı kendi profilinde gösterilen tikleri (izdivaç, doğrulama, premium vb.)
-- tek tek gizleyebilir. Dizi, gizlenmek istenen tik anahtarlarını tutar.

alter table public.profiles
  add column if not exists hidden_badges text[] not null default '{}';

comment on column public.profiles.hidden_badges is
  'Kullanıcının profilinde gizlemeyi seçtiği tik anahtarları (verified, business, premium, platform_charm, pioneer, platform_supporter, izdivac).';
