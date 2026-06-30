-- feed_activity enum değeri ayrı migration'da commit edilmeli (PostgreSQL 55P04)

alter type public.notification_event_type add value if not exists 'feed_activity';
