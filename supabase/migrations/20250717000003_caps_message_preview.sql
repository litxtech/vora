-- Caps message_type enum değeri commit edildikten sonra inbox önizlemesi

create or replace function public.update_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_for_all then
    update public.conversations
    set
      last_message_at = new.created_at,
      last_message_preview = 'Mesaj silindi',
      updated_at = now()
    where id = new.conversation_id;
  else
    update public.conversations
    set
      last_message_at = new.created_at,
      last_message_preview = left(
        case new.message_type::text
          when 'image' then '📷 Fotoğraf'
          when 'cap' then '😄 Caps'
          when 'video' then '🎬 Video'
          when 'audio' then '🎤 Ses kaydı'
          when 'location' then '📍 Konum'
          when 'file' then '📎 Dosya'
          else new.content
        end,
        120
      ),
      updated_at = now()
    where id = new.conversation_id;
  end if;
  return new;
end;
$$;
