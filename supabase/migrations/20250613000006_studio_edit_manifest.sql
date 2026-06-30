-- VORA Studio düzenlemeleri (metin overlay vb.) paylaşımda oynatılır
alter table public.posts
  add column if not exists edit_manifest jsonb;

alter table public.reels
  add column if not exists edit_manifest jsonb;

comment on column public.posts.edit_manifest is 'VORA Studio: textOverlays, trim — istemci oynatıcıda render edilir';
comment on column public.reels.edit_manifest is 'VORA Studio: textOverlays, trim — istemci oynatıcıda render edilir';
