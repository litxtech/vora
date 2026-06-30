import { ridesSupabase } from '@/features/rides/services/ridesSupabase';
import { uploadRideLicensePhoto } from '@/features/rides/services/mediaUpload';
import { supabaseErrorMessage } from '@/lib/errors';

export type LicenseVerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export async function fetchLicenseVerificationStatus(userId: string): Promise<{
  status: LicenseVerificationStatus;
  rejectionReason: string | null;
}> {
  const { data } = await ridesSupabase
    .from('ride_license_verifications')
    .select('status, rejection_reason')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { status: 'none', rejectionReason: null };
  return {
    status: data.status as LicenseVerificationStatus,
    rejectionReason: data.rejection_reason as string | null,
  };
}

export async function submitLicenseVerification(input: {
  userId: string;
  frontUri: string;
  backUri?: string;
  selfieUri: string;
}): Promise<{ error: string | null }> {
  const [front, selfie, back] = await Promise.all([
    uploadRideLicensePhoto(input.userId, input.frontUri, 'front'),
    uploadRideLicensePhoto(input.userId, input.selfieUri, 'selfie'),
    input.backUri ? uploadRideLicensePhoto(input.userId, input.backUri, 'back') : Promise.resolve({ path: null, error: null }),
  ]);

  if (front.error) return { error: front.error };
  if (selfie.error) return { error: selfie.error };
  if (back.error) return { error: back.error };
  if (!front.path || !selfie.path) return { error: 'Fotoğraflar yüklenemedi.' };

  const { error } = await ridesSupabase.from('ride_license_verifications').insert({
    user_id: input.userId,
    license_front_path: front.path,
    license_back_path: back.path,
    selfie_path: selfie.path,
    status: 'pending',
  });

  return { error: supabaseErrorMessage(error) };
}

export async function hasApprovedLicense(userId: string): Promise<boolean> {
  const { status } = await fetchLicenseVerificationStatus(userId);
  return status === 'approved';
}
