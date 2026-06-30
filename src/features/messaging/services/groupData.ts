import { supabase } from '@/lib/supabase/client';
import type { ConversationMember, ConversationMemberRole } from '../types';
import { supabaseErrorMessage } from '@/lib/errors';

type RpcMemberRow = {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: ConversationMemberRole;
  joined_at: string;
};

function mapMember(row: RpcMemberRow): ConversationMember {
  return {
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

export async function createGroupConversation(
  title: string,
  memberIds: string[],
): Promise<{ conversationId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_group_conversation', {
    p_title: title,
    p_member_ids: memberIds,
  });

  if (error) return { conversationId: null, error: supabaseErrorMessage(error)! };
  return { conversationId: data as string, error: null };
}

export async function fetchConversationMembers(
  conversationId: string,
): Promise<ConversationMember[]> {
  const { data, error } = await supabase.rpc('get_conversation_members', {
    p_conversation_id: conversationId,
  });

  if (error) throw error;
  return ((data ?? []) as RpcMemberRow[]).map(mapMember);
}

export async function addGroupMembers(
  conversationId: string,
  memberIds: string[],
): Promise<{ added: number; error: string | null }> {
  const { data, error } = await supabase.rpc('add_group_members', {
    p_conversation_id: conversationId,
    p_member_ids: memberIds,
  });

  if (error) return { added: 0, error: supabaseErrorMessage(error)! };
  return { added: Number(data ?? 0), error: null };
}

export async function removeGroupMember(
  conversationId: string,
  memberId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('remove_group_member', {
    p_conversation_id: conversationId,
    p_member_id: memberId,
  });

  return { error: supabaseErrorMessage(error) };
}

export async function updateGroupMemberRole(
  conversationId: string,
  memberId: string,
  role: ConversationMemberRole,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('update_group_member_role', {
    p_conversation_id: conversationId,
    p_member_id: memberId,
    p_role: role,
  });

  return { error: supabaseErrorMessage(error) };
}

export async function updateGroupConversation(
  conversationId: string,
  updates: { title?: string; avatarUrl?: string | null; removeAvatar?: boolean },
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('update_group_conversation', {
    p_conversation_id: conversationId,
    p_title: updates.title ?? null,
    p_avatar_url: updates.avatarUrl ?? null,
    p_remove_avatar: updates.removeAvatar ?? false,
  });

  return { error: supabaseErrorMessage(error) };
}

export async function deleteGroupConversation(
  conversationId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('delete_group_conversation', {
    p_conversation_id: conversationId,
  });

  return { error: supabaseErrorMessage(error) };
}

export function canManageMembers(role: ConversationMemberRole | null | undefined): boolean {
  return role === 'founder' || role === 'admin';
}

export function canAssignRoles(role: ConversationMemberRole | null | undefined): boolean {
  return role === 'founder';
}

export function canRemoveMembers(role: ConversationMemberRole | null | undefined): boolean {
  return role === 'founder' || role === 'admin';
}

export function canEditGroup(role: ConversationMemberRole | null | undefined): boolean {
  return role === 'founder' || role === 'admin';
}

export function canDeleteGroup(role: ConversationMemberRole | null | undefined): boolean {
  return role === 'founder';
}

export const ROLE_LABELS: Record<ConversationMemberRole, string> = {
  founder: 'Kurucu',
  admin: 'Yönetici',
  moderator: 'Moderatör',
  member: 'Üye',
};
