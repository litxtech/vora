import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type { LinkedSiblingProfile } from '@/features/account-switch/types';

type SiblingRow = {
  sibling_id: string;
  sibling_username: string;
  sibling_account_type: 'personal' | 'business';
  sibling_avatar_url: string | null;
  sibling_full_name: string | null;
};

function mapSibling(row: SiblingRow): LinkedSiblingProfile {
  return {
    siblingId: row.sibling_id,
    username: row.sibling_username,
    accountType: row.sibling_account_type,
    avatarUrl: row.sibling_avatar_url,
    fullName: row.sibling_full_name,
  };
}

export async function fetchLinkedSiblingProfile(): Promise<LinkedSiblingProfile | null> {
  const { data, error } = await supabase.rpc('get_linked_sibling_profile');
  if (error || !data?.length) return null;
  return mapSibling(data[0] as SiblingRow);
}

export async function createAccountLink(siblingUserId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('create_account_link', {
    p_sibling_user_id: siblingUserId,
  });
  if (error) return { error: supabaseErrorMessage(error)! };
  return { error: null };
}
