import * as Location from 'expo-location';
import { regionNameById } from '@/constants/regions';
import type { RegionId } from '@/constants/regions';

export async function resolveServiceLocation(regionId: RegionId): Promise<{
  latitude?: number;
  longitude?: number;
  city: string | null;
  error?: string;
}> {
  const city = regionNameById(regionId) ?? null;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return { city, error: 'Konum izni gerekli. Ayarlardan konum erişimini açın.' };
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      city,
    };
  } catch {
    return { city, error: 'Konum alınamadı. GPS açık olduğundan emin olun.' };
  }
}
