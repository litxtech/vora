-- Sesli/görüntülü arama: arayan taraf için Premium zorunluluğu kaldırıldı.
-- Uygulama tarafında SUBSCRIPTIONS_ENABLED=false ile uyumlu; engel DB trigger'ındaydı.

drop trigger if exists call_sessions_premium_check on public.call_sessions;
drop function if exists public.enforce_premium_caller();
