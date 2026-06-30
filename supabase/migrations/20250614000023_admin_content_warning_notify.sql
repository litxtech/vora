-- İçerik uyarısı: kullanıcıya zorunlu bildirim + strike takibi

alter type public.notification_event_type add value if not exists 'content_warning';

create or replace function public.admin_issue_content_warning(
  p_target_type text,
  p_target_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_warning_id uuid;
  v_existing int;
  v_strike int;
  v_max int := 3;
  v_title text;
  v_body text;
  v_content_label text;
  v_reason text;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  v_author_id := public.resolve_moderation_target_user(p_target_type, p_target_id);
  if v_author_id is null then
    raise exception 'İçerik sahibi bulunamadı';
  end if;

  if v_author_id = auth.uid() then
    raise exception 'Kendinize uyarı veremezsiniz';
  end if;

  select count(*)::int into v_existing
  from public.user_warnings
  where user_id = v_author_id
    and level = 'warning';

  v_strike := v_existing + 1;
  v_reason := coalesce(nullif(trim(p_reason), ''), 'Topluluk kurallarına aykırı içerik.');

  v_content_label := case p_target_type
    when 'post' then 'Gönderiniz'
    when 'reel' then 'Reel''iniz'
    when 'comment' then 'Yorumunuz'
    else 'İçeriğiniz'
  end;

  if v_strike = 1 then
    v_title := 'İLK UYARI — İçerik ihlali';
    v_body := format(
      '%s topluluk kurallarını ihlal ediyor. Bu birinci uyarınızdır. Kurallara uymazsanız hesabınız tamamen silinecektir. Gerekçe: %s',
      v_content_label,
      v_reason
    );
  elsif v_strike >= v_max then
    v_title := 'SON UYARI — Hesap silinecek';
    v_body := format(
      '%s (%s/%s) Bu son uyarınızdır. Bir sonraki ihlalde hesabınız tamamen ve kalıcı olarak silinecektir. Gerekçe: %s',
      v_content_label,
      v_strike,
      v_max,
      v_reason
    );
  else
    v_title := format('UYARI %s/%s — İçerik ihlali', v_strike, v_max);
    v_body := format(
      '%s tekrar kurallara aykırı. Devam eden ihlallerde hesabınız tamamen silinecektir. Gerekçe: %s',
      v_content_label,
      v_reason
    );
  end if;

  insert into public.user_warnings (user_id, issued_by, level, reason)
  values (v_author_id, auth.uid(), 'warning', v_reason)
  returning id into v_warning_id;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, metadata)
  values (
    auth.uid(),
    p_target_type,
    p_target_id,
    'warn',
    v_reason,
    jsonb_build_object(
      'warning_id', v_warning_id,
      'strike', v_strike,
      'max_strikes', v_max,
      'author_id', v_author_id
    )
  );

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (
    v_author_id,
    'content_warning'::public.notification_event_type,
    v_title,
    v_body,
    jsonb_build_object(
      'target_type', p_target_type,
      'target_id', p_target_id,
      'warning_id', v_warning_id,
      'strike', v_strike,
      'max_strikes', v_max,
      'forced', true
    ),
    auth.uid()
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    v_author_id,
    'content_warning'::public.notification_event_type,
    v_title,
    v_body,
    jsonb_build_object(
      'target_type', p_target_type,
      'target_id', p_target_id,
      'warning_id', v_warning_id,
      'strike', v_strike,
      'max_strikes', v_max
    ),
    auth.uid()
  );

  return jsonb_build_object(
    'warning_id', v_warning_id,
    'strike', v_strike,
    'max_strikes', v_max,
    'title', v_title,
    'body', v_body
  );
end;
$$;

grant execute on function public.admin_issue_content_warning(text, uuid, text) to authenticated;
