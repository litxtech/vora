-- BÖLÜM 12 — Yeni bildirim event türleri (ayrı migration: enum kullanımı için)

alter type public.notification_event_type add value if not exists 'regional_alert';

alter type public.notification_event_type add value if not exists 'share';
alter type public.notification_event_type add value if not exists 'group_message';
alter type public.notification_event_type add value if not exists 'call_video';
alter type public.notification_event_type add value if not exists 'call_missed';
alter type public.notification_event_type add value if not exists 'business_post';
alter type public.notification_event_type add value if not exists 'business_campaign';
alter type public.notification_event_type add value if not exists 'business_event';
alter type public.notification_event_type add value if not exists 'system';
