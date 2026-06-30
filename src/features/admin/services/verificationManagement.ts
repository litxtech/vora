import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type PostVerificationRow = {
  id: string;
  post_id: string;
  region_id: string;
  status: 'reviewing' | 'verified' | 'misinfo';
  verified_votes: number;
  misinfo_votes: number;
  reviewing_votes: number;
  created_at: string;
};

export async function fetchPostVerifications(
  status?: 'reviewing' | 'verified' | 'misinfo',
): Promise<PostVerificationRow[]> {
  const { data, error } = await supabase.rpc('admin_list_post_verifications', {
    p_status: status ?? null,
    p_limit: 50,
  });
  if (error || !data) return [];
  return data as PostVerificationRow[];
}

export async function setPostVerificationStatus(
  verificationId: string,
  status: 'reviewing' | 'verified' | 'misinfo',
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_post_verification_status', {
    p_verification_id: verificationId,
    p_status: status,
  });
  return { error: supabaseErrorMessage(error) };
}
