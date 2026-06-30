-- Güven puanı cezaları yalnızca moderasyon onayından sonra uygulanır.
-- Şikayet bildirimi anında puan düşürmez. İçerik kaldırma aksiyonu ekstra ceza vermez.

create or replace function public.trust_penalty_for_violation(p_reason text)
returns int
language sql
immutable
set search_path = public
as $$
  select case
    when p_reason in ('spam') then -3
    when p_reason in ('misinformation') then -6
    when p_reason in ('harassment', 'fraud', 'abuse', 'violence') then -8
    when p_reason in ('child_safety') then -15
    else 0
  end;
$$;

-- Şikayet insert: artık puan düşürmez (tetikleyici kaldırıldı)
drop trigger if exists content_reported_trust on public.content_reports;

create or replace function public.on_content_reported_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  return new;
end;
$$;

create or replace function public.on_moderation_action_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_penalty int := 0;
  v_reason text;
  v_note text;
begin
  v_user_id := public.resolve_moderation_target_user(new.target_type, new.target_id);
  if v_user_id is null then
    return new;
  end if;

  v_reason := coalesce(nullif(new.metadata->>'report_reason', ''), nullif(new.reason, ''));

  if new.action = 'warn' then
    v_penalty := -5;
    v_note := 'Moderasyon uyarısı';
  elsif new.action = 'ban' then
    v_penalty := -50;
    v_note := 'Hesap kısıtlama';
  elsif new.action = 'remove' then
    -- İçerik kaldırma: ekstra ceza yok; onaylanmış ihlal türü varsa o kadar düşer
    v_penalty := public.trust_penalty_for_violation(v_reason);
    if v_penalty = 0 then
      return new;
    end if;
    v_note := coalesce(v_reason, 'Onaylanmış ihlal');
  elsif new.action = 'hide' then
    v_penalty := public.trust_penalty_for_violation(v_reason);
    if v_penalty = 0 then
      v_penalty := -8;
    end if;
    v_note := coalesce(v_reason, 'İçerik gizleme');
  else
    v_penalty := public.trust_penalty_for_violation(v_reason);
    if v_penalty = 0 then
      return new;
    end if;
    v_note := coalesce(v_reason, new.action::text);
  end if;

  perform public.apply_trust_delta(
    v_user_id,
    v_penalty,
    'moderation_penalty',
    new.id::text,
    v_note
  );

  return new;
end;
$$;

drop trigger if exists moderation_action_trust on public.moderation_actions;
create trigger moderation_action_trust
  after insert on public.moderation_actions
  for each row execute function public.on_moderation_action_trust();

-- Platform rehberi: puan düşüşü açıklaması (tablo yoksa atla)
do $$
begin
  if to_regclass('public.platform_guides') is not null then
    update public.platform_guides
    set sections = (
      select jsonb_agg(
        case
          when elem->>'heading' = 'Puan düşüşü' then
            jsonb_build_object(
              'heading', 'Puan düşüşü',
              'body',
              'Bir kullanıcıyı şikayet etmek puan düşürmez. Moderasyon ekibi ihlali onayladığında (uyarı, gizleme veya içerik kaldırma) güven puanınız düşebilir. İçerik kaldırmanın kendisi ekstra ceza değildir; ceza ihlal türüne göre belirlenir.'
            )
          else elem
        end
      )
      from jsonb_array_elements(sections) elem
    )
    where slug = 'guven-puani'
      and exists (
        select 1
        from jsonb_array_elements(sections) elem
        where elem->>'heading' = 'Puan düşüşü'
      );
  end if;
end;
$$;
