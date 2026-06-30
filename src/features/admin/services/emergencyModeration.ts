import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type UserActivityEvent = {
  event_type: string;
  title: string;
  detail: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type NewsVerificationOwnerRow = {
  author_id: string;
  author_username: string;
  correct_count: number;
  incorrect_count: number;
  total_verifications: number;
  last_verification_at: string;
};

export async function fetchUserActivityTimeline(
  userId: string,
  limit = 60,
): Promise<UserActivityEvent[]> {
  const { data, error } = await supabase.rpc('admin_get_user_activity_timeline', {
    p_user_id: userId,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as UserActivityEvent[];
}

export async function fetchNewsVerificationOwners(
  limit = 20,
): Promise<NewsVerificationOwnerRow[]> {
  const { data, error } = await supabase.rpc('admin_list_news_verification_owners', {
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as NewsVerificationOwnerRow[];
}

export async function emergencyQuarantineUser(
  userId: string,
  reason: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_emergency_quarantine_user', {
    p_user_id: userId,
    p_reason: reason,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function releaseQuarantineUser(
  userId: string,
  note?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_release_quarantine_user', {
    p_user_id: userId,
    p_note: note ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function removeAllUserContent(
  userId: string,
  reason?: string,
): Promise<{ error: string | null; postsRemoved?: number; reelsRemoved?: number }> {
  const { data, error } = await supabase.rpc('admin_remove_all_user_content', {
    p_user_id: userId,
    p_reason: reason ?? null,
  });
  if (error) return { error: supabaseErrorMessage(error)! };
  const result = data as { posts_removed?: number; reels_removed?: number } | null;
  return {
    error: null,
    postsRemoved: result?.posts_removed,
    reelsRemoved: result?.reels_removed,
  };
}
