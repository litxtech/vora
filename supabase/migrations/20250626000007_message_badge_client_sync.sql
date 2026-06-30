-- Rozet: istemci arka planda sunucudan okunmamış mesaj sayısını okuyabilsin.

create or replace function public.get_messaging_unread_count(p_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if p_user_id is null then
    return 0;
  end if;

  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  return (
    select coalesce(sum(sub.unread), 0)::bigint
    from (
      select (
        select count(*)
        from public.messages m
        where m.conversation_id = c.id
          and m.sender_id <> p_user_id
          and m.deleted_for_all = false
          and m.created_at > coalesce(cm.last_read_at, '1970-01-01'::timestamptz)
          and not exists (
            select 1 from public.message_deletions md
            where md.message_id = m.id and md.user_id = p_user_id
          )
      ) as unread
      from public.conversation_members cm
      join public.conversations c on c.id = cm.conversation_id
      where cm.user_id = p_user_id
        and cm.is_archived = false
        and (
          cm.hidden_at is null
          or coalesce(c.last_message_at, c.created_at) > cm.hidden_at
        )
    ) sub
  );
end;
$$;

grant execute on function public.get_messaging_unread_count(uuid) to authenticated;
grant execute on function public.get_messaging_unread_count(uuid) to service_role;

notify pgrst, 'reload schema';
