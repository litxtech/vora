-- Mesajlaşma RPC'lerine authenticated erişim

grant execute on function public.get_conversation_detail(uuid) to authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
grant execute on function public.show_conversation(uuid) to authenticated;
grant execute on function public.get_user_conversations(boolean) to authenticated;
