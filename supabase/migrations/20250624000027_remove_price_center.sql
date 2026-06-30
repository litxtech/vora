-- Kaldırılan merkez: Fiyat Takip Merkezi
delete from public.app_feature_flags
where feature_id = 'price';
