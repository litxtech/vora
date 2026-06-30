import { supabase } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';
import { supabaseErrorMessage } from '@/lib/errors';

export type StaffMemberRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  account_status: string;
  last_seen_at: string | null;
  created_at: string;
};

const PRIVILEGED_ROLES: UserRole[] = ['moderator', 'admin', 'super_admin'];

export async function fetchPrivilegedUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, role, account_status, last_seen_at, created_at')
    .in('role', PRIVILEGED_ROLES)
    .order('username', { ascending: true });

  return { data: (data ?? []) as StaffMemberRow[], error: supabaseErrorMessage(error) };
}

export async function searchUsersForStaff(search: string, limit = 20) {
  let query = supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, role, account_status')
    .order('username', { ascending: true })
    .limit(limit);

  if (search.trim()) {
    query = query.or(`username.ilike.%${search.trim()}%,full_name.ilike.%${search.trim()}%`);
  }

  const { data, error } = await query;
  return {
    data: (data ?? []) as Pick<
      StaffMemberRow,
      'id' | 'username' | 'full_name' | 'avatar_url' | 'role' | 'account_status'
    >[],
    error: supabaseErrorMessage(error),
  };
}
