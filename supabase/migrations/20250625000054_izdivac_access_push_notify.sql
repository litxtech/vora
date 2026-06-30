-- İzdivaç erişimi verildiğinde inbox + push (notification_outbox)

insert into public.notification_sound_settings (event_type, label) values
  ('izdivac_access_granted', 'İzdivaç Erişimi')
on conflict (event_type) do nothing;

create or replace function public.admin_grant_izdivac_access(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_granted boolean;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz erişim';
  end if;

  update public.profiles
  set izdivac_access_granted = true, updated_at = now()
  where id = p_user_id
    and izdivac_access_granted = false
  returning izdivac_access_granted into v_granted;

  if not found then
    update public.profiles
    set izdivac_access_granted = true, updated_at = now()
    where id = p_user_id;
    return;
  end if;

  perform public.notify_profile_user(
    p_user_id,
    'izdivac_access_granted',
    'İzdivaç erişiminiz açıldı',
    'Tebrikler! İzdivaç merkezine katılabilirsiniz. Merkezler sekmesinden giriş yaparak tanışma alanına ulaşabilirsiniz.',
    jsonb_build_object(
      'kind', 'izdivac_access_granted',
      'centerId', 'izdivac-center',
      'deep_link', '/izdivac-center',
      'action_hint', 'İzdivaç merkezine git'
    )
  );
end;
$$;
