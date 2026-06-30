import type { RideTrustBadges } from '@/features/rides/types';

export async function fetchRideTrustBadges(
  userId: string,
  profile?: { is_verified?: boolean } | null,
): Promise<RideTrustBadges> {
  const { supabase } = await import('@/lib/supabase/client');
  const { ridesSupabase } = await import('@/features/rides/services/ridesSupabase');

  const { data: authUser } = await supabase.auth.getUser();

  const { data: license } = await ridesSupabase
    .from('ride_license_verifications')
    .select('status')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .limit(1);

  const { data: vehicle } = await ridesSupabase
    .from('ride_vehicles')
    .select('verification_status')
    .eq('user_id', userId)
    .eq('verification_status', 'approved')
    .limit(1);

  const u = authUser.user;
  return {
    phoneVerified: !!u?.phone_confirmed_at,
    emailVerified: !!u?.email_confirmed_at,
    identityVerified: !!profile?.is_verified,
    licenseVerified: (license?.length ?? 0) > 0,
    vehicleVerified: (vehicle?.length ?? 0) > 0,
  };
}
