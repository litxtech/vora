-- Gönderi kategorileri: eğlence ve günlük
alter type public.post_category add value if not exists 'entertainment';
alter type public.post_category add value if not exists 'daily';
