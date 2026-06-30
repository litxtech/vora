-- PostgreSQL: enum değerleri ayrı transaction'da eklenmeli (55P04)

alter type public.notification_event_type add value if not exists 'friend_invite_referral';
