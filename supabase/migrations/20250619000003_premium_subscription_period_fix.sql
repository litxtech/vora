-- Bitiş tarihi başlangıçla aynı veya daha erken kaydedilmiş abonelikleri düzelt
update public.premium_subscriptions
set
  expires_at = case
    when plan = 'monthly' then starts_at + interval '1 month'
    else starts_at + interval '1 year'
  end
where status = 'active'
  and expires_at <= starts_at + interval '1 day';
