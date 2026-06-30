-- İzdivaç özel tik notları (jigolo, tilki, finansman)
-- Tike tıklanınca açılan açıklama notu. Admin tarafından düzenlenebilir,
-- silinebilir (varsayılana döner) ve yeniden eklenebilir. Etiket de opsiyonel
-- olarak override edilebilir.

create table if not exists public.izdivac_badge_notes (
  badge_type text primary key check (badge_type in ('jigolo', 'tilki', 'finansman')),
  label text,
  note text not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.izdivac_badge_notes enable row level security;

drop policy if exists izdivac_badge_notes_read on public.izdivac_badge_notes;
create policy izdivac_badge_notes_read on public.izdivac_badge_notes
  for select to authenticated using (true);

-- ─── Okuma ───────────────────────────────────────────────────────────────────

create or replace function public.izdivac_badge_notes()
returns table (badge_type text, label text, note text)
language sql
stable
security definer
set search_path = public
as $$
  select n.badge_type, n.label, n.note
  from public.izdivac_badge_notes n;
$$;

grant execute on function public.izdivac_badge_notes() to authenticated;

-- ─── Admin: not ekle / güncelle ────────────────────────────────────────────

create or replace function public.admin_set_izdivac_badge_note(
  p_badge_type text,
  p_note text,
  p_label text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note text := trim(coalesce(p_note, ''));
  v_label text := nullif(trim(coalesce(p_label, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz erişim';
  end if;

  if p_badge_type not in ('jigolo', 'tilki', 'finansman') then
    raise exception 'Geçersiz tik türü';
  end if;

  if v_note = '' then
    raise exception 'Not boş olamaz';
  end if;

  insert into public.izdivac_badge_notes (badge_type, label, note, updated_by, updated_at)
  values (p_badge_type, v_label, v_note, auth.uid(), now())
  on conflict (badge_type)
  do update set label = excluded.label, note = excluded.note,
                updated_by = excluded.updated_by, updated_at = now();
end;
$$;

grant execute on function public.admin_set_izdivac_badge_note(text, text, text) to authenticated;

-- ─── Admin: notu sil (varsayılana dön) ─────────────────────────────────────

create or replace function public.admin_delete_izdivac_badge_note(p_badge_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz erişim';
  end if;

  delete from public.izdivac_badge_notes where badge_type = p_badge_type;
end;
$$;

grant execute on function public.admin_delete_izdivac_badge_note(text) to authenticated;
