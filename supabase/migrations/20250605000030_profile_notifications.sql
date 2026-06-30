-- Profil bildirimleri: yeni event türleri (kullanım ayrı migration'da)

alter type public.notification_event_type add value if not exists 'trust_score_change';
alter type public.notification_event_type add value if not exists 'achievement_earned';
alter type public.notification_event_type add value if not exists 'badge_earned';
