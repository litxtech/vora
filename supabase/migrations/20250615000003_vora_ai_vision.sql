-- Vora AI görsel/video analizi modülü ve sistem yorumu istisnası

insert into public.ai_settings (module, label, enabled) values
  ('vision', 'Görsel & Video Analizi', true)
on conflict (module) do nothing;

-- Vora AI sistem hesabı rate limit'ten muaf (yorum olarak paylaşım)
create or replace function public.enforce_comment_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_id = 'f0000000-0000-4000-8000-00000000a101'::uuid then
    return new;
  end if;
  if not public.check_rate_limit(new.author_id, 'comment', 15, 60) then
    raise exception 'Çok fazla yorum gönderdiniz. Lütfen bekleyin.';
  end if;
  return new;
end;
$$;
