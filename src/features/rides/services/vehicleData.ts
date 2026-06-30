import { ridesSupabase } from '@/features/rides/services/ridesSupabase';
import type { CreateVehicleInput, RideVehicle, UpdateVehicleInput } from '@/features/rides/types';
import { uploadRideVehiclePhotos } from '@/features/rides/services/mediaUpload';
import { supabaseErrorMessage } from '@/lib/errors';

function isLocalPhotoUri(uri: string): boolean {
  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('ph://') ||
    uri.startsWith('assets-library://')
  );
}

async function resolvePhotoUrls(
  userId: string,
  photoUris: string[],
): Promise<{ urls: string[]; error: string | null }> {
  const remoteUrls = photoUris.filter((uri) => !isLocalPhotoUri(uri));
  const localUris = photoUris.filter(isLocalPhotoUri);

  if (localUris.length === 0) {
    return { urls: remoteUrls, error: null };
  }

  const { urls, error } = await uploadRideVehiclePhotos(userId, localUris);
  if (error) return { urls: remoteUrls, error };
  return { urls: [...remoteUrls, ...urls], error: null };
}

type VehicleRow = {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year: number | null;
  plate: string;
  color: string | null;
  vehicle_type: string;
  seats_total: number;
  photo_urls: string[];
  cover_url: string | null;
  verification_status: string;
  is_active: boolean;
  created_at: string;
};

function mapVehicle(row: VehicleRow): RideVehicle {
  return {
    id: row.id,
    userId: row.user_id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    plate: row.plate,
    color: row.color,
    vehicleType: row.vehicle_type as RideVehicle['vehicleType'],
    seatsTotal: row.seats_total,
    photoUrls: row.photo_urls ?? [],
    coverUrl: row.cover_url,
    verificationStatus: row.verification_status as RideVehicle['verificationStatus'],
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function fetchUserVehicles(userId: string): Promise<RideVehicle[]> {
  const { data, error } = await ridesSupabase
    .from('ride_vehicles')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return [];
  return ((data ?? []) as VehicleRow[]).map(mapVehicle);
}

export async function fetchVehicle(id: string): Promise<RideVehicle | null> {
  const { data, error } = await ridesSupabase.from('ride_vehicles').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapVehicle(data as VehicleRow);
}

export async function createVehicle(
  userId: string,
  input: CreateVehicleInput,
): Promise<{ vehicleId: string | null; error: string | null }> {
  const { urls, error: uploadError } = await resolvePhotoUrls(userId, input.photoUris);
  if (uploadError) return { vehicleId: null, error: uploadError };
  if (!urls.length) return { vehicleId: null, error: 'En az bir fotoğraf gerekli' };

  const { data, error } = await ridesSupabase
    .from('ride_vehicles')
    .insert({
      user_id: userId,
      brand: input.brand.trim(),
      model: input.model.trim(),
      year: input.year ?? null,
      plate: input.plate.trim().toUpperCase(),
      color: input.color?.trim() || null,
      vehicle_type: input.vehicleType,
      seats_total: input.seatsTotal,
      photo_urls: urls,
      cover_url: urls[0] ?? null,
    })
    .select('id')
    .single();

  if (error) return { vehicleId: null, error: supabaseErrorMessage(error)! };
  return { vehicleId: (data as { id: string }).id, error: null };
}

export async function updateVehicle(
  vehicleId: string,
  userId: string,
  input: UpdateVehicleInput,
): Promise<{ error: string | null }> {
  const existing = await fetchVehicle(vehicleId);
  if (!existing || existing.userId !== userId) {
    return { error: 'Araç bulunamadı' };
  }

  const { urls, error: uploadError } = await resolvePhotoUrls(userId, input.photoUris);
  if (uploadError) return { error: uploadError };
  if (!urls.length) return { error: 'En az bir fotoğraf gerekli' };

  const plate = input.plate.trim().toUpperCase();
  const photosChanged =
    urls.length !== existing.photoUrls.length || urls.some((url, index) => url !== existing.photoUrls[index]);
  const detailsChanged =
    input.brand.trim() !== existing.brand ||
    input.model.trim() !== existing.model ||
    plate !== existing.plate ||
    (input.year ?? null) !== existing.year ||
    (input.color?.trim() || null) !== existing.color ||
    input.vehicleType !== existing.vehicleType;

  const needsReverification = photosChanged || detailsChanged;

  const payload: Record<string, unknown> = {
    brand: input.brand.trim(),
    model: input.model.trim(),
    year: input.year ?? null,
    plate,
    color: input.color?.trim() || null,
    vehicle_type: input.vehicleType,
    seats_total: input.seatsTotal,
    photo_urls: urls,
    cover_url: urls[0] ?? null,
    updated_at: new Date().toISOString(),
  };

  if (needsReverification) {
    payload.verification_status = 'pending';
    payload.rejection_reason = null;
    payload.verified_at = null;
  }

  const { error } = await ridesSupabase
    .from('ride_vehicles')
    .update(payload)
    .eq('id', vehicleId)
    .eq('user_id', userId);

  return { error: supabaseErrorMessage(error) };
}

export async function deactivateVehicle(
  vehicleId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await ridesSupabase
    .from('ride_vehicles')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', vehicleId)
    .eq('user_id', userId);

  return { error: supabaseErrorMessage(error) };
}

export async function hasApprovedVehicle(userId: string): Promise<boolean> {
  const vehicles = await fetchUserVehicles(userId);
  return vehicles.some((v) => v.verificationStatus === 'approved');
}

export function isVehicleApprovedForPublish(vehicle: RideVehicle | null | undefined): boolean {
  return !!vehicle && vehicle.isActive && vehicle.verificationStatus === 'approved';
}
