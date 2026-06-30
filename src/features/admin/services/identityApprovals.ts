import type { IdentityVerificationStatus } from '@/features/identity-verification/constants';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type IdentityApprovalRow = {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  status: IdentityVerificationStatus;
  document_type: string;
  applicant_name: string;
  birth_date: string | null;
  id_front_path: string;
  id_back_path: string | null;
  selfie_path: string;
  rejection_reason: string | null;
  created_at: string;
};

export async function fetchIdentityVerifications(
  status?: IdentityVerificationStatus,
): Promise<{ data: IdentityApprovalRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_list_identity_verifications', {
    p_status: status ?? undefined,
    p_limit: 50,
  });

  return { data: (data as IdentityApprovalRow[]) ?? [], error: supabaseErrorMessage(error) };
}

export async function approveIdentityVerification(requestId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_approve_identity_verification', {
    p_request_id: requestId,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function rejectIdentityVerification(
  requestId: string,
  reason: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_reject_identity_verification', {
    p_request_id: requestId,
    p_reason: reason,
  });
  return { error: supabaseErrorMessage(error) };
}
