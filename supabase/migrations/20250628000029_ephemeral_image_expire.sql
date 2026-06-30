-- Süreli sohbet fotoğrafları — güvenilir silme RPC

create or replace function public.expire_ephemeral_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_meta jsonb;
begin
  if v_user_id is null then
    raise exception 'Giriş yapmanız gerekiyor';
  end if;

  select m.metadata into v_meta
  from public.messages m
  inner join public.conversation_members cm
    on cm.conversation_id = m.conversation_id
   and cm.user_id = v_user_id
  where m.id = p_message_id
    and coalesce(m.metadata->>'ephemeral', 'false') in ('true', 't', '1')
  limit 1;

  if v_meta is null then
    return;
  end if;

  update public.messages
  set
    deleted_for_all = true,
    content = '',
    media_url = null,
    metadata = coalesce(v_meta, '{}'::jsonb) || jsonb_build_object('expired', true)
  where id = p_message_id;
end;
$$;

grant execute on function public.expire_ephemeral_message(uuid) to authenticated;
