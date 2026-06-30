import { supabase } from '@/lib/supabase/client';

/** Storage path veya tam URL → görüntülenebilir URL */
export function resolveRideVehiclePhotoUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const { data } = supabase.storage.from('ride-vehicles').getPublicUrl(url.replace(/^\/+/, ''));
  return data.publicUrl ?? null;
}
