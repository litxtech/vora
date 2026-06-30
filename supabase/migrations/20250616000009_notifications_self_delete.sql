-- Kullanıcılar kendi bildirimlerini silebilsin (toplu silme dahil)
create policy "notifications_self_delete" on public.notifications
  for delete using (auth.uid() = user_id);
