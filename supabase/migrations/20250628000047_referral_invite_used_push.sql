-- VORADA Hakediş — bildirim event tipi (enum ayrı migration'da commit edilmeli)

alter type public.notification_event_type add value if not exists 'referral_invite_used';
