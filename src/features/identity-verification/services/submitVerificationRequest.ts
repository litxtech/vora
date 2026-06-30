import { uploadIdentityDocuments } from '@/features/identity-verification/services/uploadIdentityDocuments';
import type { SubmitIdentityVerificationInput } from '@/features/identity-verification/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function submitVerificationRequest(
  userId: string,
  input: SubmitIdentityVerificationInput,
): Promise<{ requestId: string | null; error: string | null }> {
  const { idFrontPath, idBackPath, selfiePath, error: uploadError } = await uploadIdentityDocuments(
    userId,
    {
      idFront: input.idFront,
      idBack: input.idBack,
      selfie: input.selfie,
    },
  );

  if (uploadError || !idFrontPath || !selfiePath) {
    return { requestId: null, error: uploadError ?? 'Belge yüklenemedi.' };
  }

  const { data, error } = await supabase.rpc('submit_identity_verification_request', {
    p_document_type: input.documentType,
    p_full_name: input.fullName.trim(),
    p_birth_date: input.birthDate,
    p_id_front_path: idFrontPath,
    p_id_back_path: idBackPath ?? '',
    p_selfie_path: selfiePath,
  });

  if (error) return { requestId: null, error: supabaseErrorMessage(error)! };
  return { requestId: data as string, error: null };
}
