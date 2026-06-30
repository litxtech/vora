import { supabase } from '@/lib/supabase/client';

const RIDE_VEHICLES_BUCKET = 'ride-vehicles';

export function getRideLicensePhotoUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  const { data } = supabase.storage.from(RIDE_VEHICLES_BUCKET).getPublicUrl(path.trim());
  return data.publicUrl ?? null;
}
