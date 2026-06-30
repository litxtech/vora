import type { IdentityVerificationRequest } from '@/features/identity-verification/types';
import { supabase } from '@/lib/supabase/client';

function mapRow(row: Record<string, unknown>): IdentityVerificationRequest {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    status: row.status as IdentityVerificationRequest['status'],
    documentType: row.document_type as IdentityVerificationRequest['documentType'],
    fullName: row.full_name as string,
    birthDate: (row.birth_date as string | null) ?? null,
    idFrontPath: row.id_front_path as string,
    idBackPath: (row.id_back_path as string | null) ?? null,
    selfiePath: row.selfie_path as string,
    rejectionReason: (row.rejection_reason as string | null) ?? null,
    createdAt: row.created_at as string,
    reviewedAt: (row.reviewed_at as string | null) ?? null,
  };
}

export async function fetchLatestVerificationRequest(
  userId: string,
): Promise<IdentityVerificationRequest | null> {
  const { data, error } = await supabase
    .from('identity_verification_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}
