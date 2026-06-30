-- İlan sahibi kendi kayıp/buluntu ilanını silebilir
drop policy if exists "lost_items_author_delete" on public.lost_items;
create policy "lost_items_author_delete" on public.lost_items
  for delete using (auth.uid() = author_id);
