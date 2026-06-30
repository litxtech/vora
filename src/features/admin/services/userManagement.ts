import { adminDeleteUserAccount } from '@/features/account-deletion/services/accountDeletion';
import { fetchAdminUserContactFields } from '@/features/profile/services/profileContactFields';
import { supabase } from '@/lib/supabase/client';
import type { BanDuration } from '@/features/admin/types';
import type { UserRole } from '@/types/database';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchAdminUsers(search?: string, limit = 50) {
  let query = supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, role, account_status, trust_score, is_premium, is_verified, region_id, created_at, last_seen_at, last_active_at, is_online')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search?.trim()) {
    query = query.or(`username.ilike.%${search.trim()}%,full_name.ilike.%${search.trim()}%`);
  }

  const { data, error } = await query;
  return { data: data ?? [], error: supabaseErrorMessage(error) };
}

export type AdminUserPresence = {
  last_seen_at: string | null;
  last_active_at: string | null;
  is_online: boolean;
};

export async function fetchAdminUserPresence(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('last_seen_at, last_active_at, is_online')
    .eq('id', userId)
    .single();

  return { data: (data as AdminUserPresence | null) ?? null, error: supabaseErrorMessage(error) };
}

export async function fetchAdminUser(id: string) {
  const [{ data, error }, emailResult, contactFields] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.rpc('admin_get_user_email', { p_user_id: id }),
    fetchAdminUserContactFields(id),
  ]);

  if (error) return { data: null, error: supabaseErrorMessage(error)! };

  const { count } = await supabase
    .from('content_reports')
    .select('*', { count: 'exact', head: true })
    .eq('reporter_id', id);

  return {
    data: {
      ...data,
      address: contactFields?.address ?? null,
      iban: contactFields?.iban ?? null,
      bank_name: contactFields?.bank_name ?? null,
      bank_account_name: contactFields?.bank_account_name ?? null,
      email: emailResult.error ? null : (emailResult.data as string | null),
      report_count: count ?? 0,
    },
    error: null,
  };
}

export async function fetchUserReportsAgainst(userId: string) {
  const { data, error } = await supabase
    .from('content_reports')
    .select('id, reason, status, created_at, reporter_id')
    .or(`target_type.eq.user,target_type.eq.profile`)
    .eq('target_id', userId)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error: supabaseErrorMessage(error) };
}

export async function updateUserRole(userId: string, role: UserRole) {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  return { error: supabaseErrorMessage(error) };
}

export async function deleteUserAccountByPlatform(userId: string) {
  return adminDeleteUserAccount(userId);
}

export async function updateAccountStatus(
  userId: string,
  accountStatus: 'active' | 'frozen' | 'deletion_pending' | 'deleted',
) {
  const { error } = await supabase
    .from('profiles')
    .update({ account_status: accountStatus })
    .eq('id', userId);
  return { error: supabaseErrorMessage(error) };
}

export async function banUser(userId: string, reason: string, duration: BanDuration) {
  const { data, error } = await supabase.rpc('admin_ban_user', {
    p_user_id: userId,
    p_reason: reason,
    p_duration: duration,
  });
  return { data, error: supabaseErrorMessage(error) };
}

export async function liftBan(userId: string) {
  const { error } = await supabase.rpc('admin_lift_ban', { p_user_id: userId });
  return { error: supabaseErrorMessage(error) };
}

export async function sendAdminMessage(recipientId: string, title: string, body: string) {
  const { error } = await supabase.from('notifications').insert({
    user_id: recipientId,
    event_type: 'message',
    title,
    body,
    data: { admin_message: true },
  });
  return { error: supabaseErrorMessage(error) };
}

export async function setNewsVerificationGranted(userId: string, granted: boolean) {
  const { error } = await supabase.rpc('admin_set_news_verification_granted', {
    p_user_id: userId,
    p_granted: granted,
  });
  return { error: supabaseErrorMessage(error) };
}

export type AdminProfileUpdateInput = {
  username?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  occupation?: string;
  regionId?: string;
  district?: string;
  address?: string;
  iban?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  gender?: 'female' | 'male' | 'other' | 'prefer_not_to_say';
  birthDate?: string | null;
  interests?: string[];
  avatarUrl?: string | null;
  coverUrl?: string | null;
  profileVisibility?: 'public' | 'members' | 'friends';
  showProfileViews?: boolean;
  showLikedPosts?: boolean;
};

export async function adminUpdateUserProfile(userId: string, updates: AdminProfileUpdateInput) {
  const fullName =
    updates.firstName !== undefined || updates.lastName !== undefined
      ? [updates.firstName?.trim(), updates.lastName?.trim()].filter(Boolean).join(' ') || null
      : undefined;

  const { error } = await supabase
    .from('profiles')
    .update({
      ...(updates.username !== undefined ? { username: updates.username } : {}),
      first_name: updates.firstName?.trim(),
      last_name: updates.lastName?.trim(),
      full_name: fullName,
      bio: updates.bio,
      occupation: updates.occupation,
      region_id: updates.regionId,
      district: updates.district,
      address: updates.address?.trim() || null,
      iban: updates.iban,
      bank_name: updates.bankName?.trim() || null,
      bank_account_name: updates.bankAccountName?.trim() || null,
      gender: updates.gender,
      birth_date: updates.birthDate,
      interests: updates.interests,
      avatar_url: updates.avatarUrl,
      cover_url: updates.coverUrl,
      profile_visibility: updates.profileVisibility,
      show_profile_views: updates.showProfileViews,
      show_liked_posts: updates.showLikedPosts,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  return { error: supabaseErrorMessage(error) };
}
