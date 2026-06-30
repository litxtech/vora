-- Öncü rozeti enum değeri (ayrı migration — PG aynı tx'te kullanımı engeller)

alter type public.badge_type add value if not exists 'pioneer';
