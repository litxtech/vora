-- Gönderi yorumlarına galeri görseli (media_urls)

alter table public.post_comments
  add column if not exists media_urls text[] not null default '{}';

comment on column public.post_comments.media_urls is
  'Yorumlara eklenen görsel public URL listesi (post-media bucket).';
