-- VORADA Hakediş — davet kodu kullanıldığında davet edene push bildirimi
-- Kod sabit kalır (sınırsız kullanım); her kullanımda davet edene toplam davet sayısı bildirilir.

insert into public.notification_sound_settings (event_type, label) values
  ('referral_invite_used', 'Davet Kodu Kullanıldı')
on conflict (event_type) do nothing;

create or replace function public.referral_establish_relationship(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_normalized text;
  v_inviter_id uuid;
  v_campaign_id uuid;
  v_settings public.referral_settings%rowtype;
  v_relationship_id uuid;
  v_commission_id uuid;
  v_invitee_username text;
  v_total_invites int;
begin
  if v_user_id is null then
    raise exception 'Giriş yapmalısınız';
  end if;

  v_normalized := public.normalize_friend_invite_code(p_code);

  if char_length(v_normalized) < 6 then
    return jsonb_build_object('ok', false, 'error', 'Geçersiz davet kodu');
  end if;

  if exists (select 1 from public.referral_relationships where invitee_id = v_user_id) then
    return jsonb_build_object('ok', false, 'error', 'Zaten bir davet ilişkiniz var');
  end if;

  select id into v_inviter_id
  from public.profiles
  where invite_code = v_normalized;

  if v_inviter_id is null then
    return jsonb_build_object('ok', false, 'error', 'Davet kodu bulunamadı');
  end if;

  if v_inviter_id = v_user_id then
    return jsonb_build_object('ok', false, 'error', 'Kendi davet kodunuzu kullanamazsınız');
  end if;

  if to_regclass('public.referral_blacklist') is not null then
    if public.referral_is_user_blacklisted(v_inviter_id) or public.referral_is_user_blacklisted(v_user_id) then
      return jsonb_build_object('ok', false, 'error', 'Davet işlemi engellendi');
    end if;
  end if;

  v_campaign_id := public.referral_get_active_campaign_id();
  if v_campaign_id is null then
    return jsonb_build_object('ok', false, 'error', 'Hakediş kampanyası aktif değil');
  end if;

  select * into v_settings from public.referral_settings where campaign_id = v_campaign_id;

  insert into public.referral_relationships (inviter_id, invitee_id, invite_code, campaign_id)
  values (v_inviter_id, v_user_id, v_normalized, v_campaign_id)
  returning id into v_relationship_id;

  insert into public.referral_commissions (
    inviter_id, invitee_id, relationship_id, campaign_id, amount_cents, status, registered_at
  )
  values (
    v_inviter_id, v_user_id, v_relationship_id, v_campaign_id, v_settings.reward_amount_cents, 'pending', now()
  )
  returning id into v_commission_id;

  insert into public.referral_metrics (invitee_id, relationship_id, first_login_at, last_login_at)
  values (v_user_id, v_relationship_id, now(), now());

  perform public.referral_recompute_commission(v_commission_id);

  select coalesce(nullif(trim(username), ''), 'Bir kullanıcı')
  into v_invitee_username
  from public.profiles
  where id = v_user_id;

  select count(*)::int into v_total_invites
  from public.referral_relationships
  where inviter_id = v_inviter_id;

  perform public.notify_profile_user(
    v_inviter_id,
    'referral_invite_used',
    'Davet kodun kullanıldı!',
    format(
      '%s davetinle katıldı. Toplam %s kişi getirdin. Yeni kişileri davet etmeye devam et.',
      v_invitee_username,
      v_total_invites
    ),
    jsonb_build_object(
      'kind', 'referral_invite_used',
      'inviteeId', v_user_id,
      'inviteeUsername', v_invitee_username,
      'totalInvites', v_total_invites,
      'commissionId', v_commission_id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'relationship_id', v_relationship_id,
    'commission_id', v_commission_id,
    'total_invites', v_total_invites
  );
end;
$$;

grant execute on function public.referral_establish_relationship(text) to authenticated;
