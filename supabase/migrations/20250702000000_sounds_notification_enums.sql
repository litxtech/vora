-- Ses bildirimleri — enum değerleri ayrı migration (55P04: aynı transaction'da kullanılamaz)

alter type public.notification_event_type add value if not exists 'sound_used';
alter type public.notification_event_type add value if not exists 'sound_liked';
alter type public.notification_event_type add value if not exists 'sound_trending';
alter type public.notification_event_type add value if not exists 'sound_favorited';
alter type public.notification_event_type add value if not exists 'sound_reported';
