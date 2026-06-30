import * as Location from 'expo-location';
import { regionMapCenter } from '@/features/map/constants';
import type { RegionId } from '@/constants/regions';
import type { VoraNeedVisibility } from '@/features/vora-needs/types';

type ResolvedLocation = {
  latitude: number;
  longitude: number;
};

type LocationResult =
  | ({ error?: undefined } & ResolvedLocation)
  | { error: string; latitude?: undefined; longitude?: undefined };

async function readDeviceLocation(): Promise<ResolvedLocation | null> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return null;
  }
}

/** Harita pin'i için konum — yakınlık GPS zorunlu, diğerlerinde GPS veya bölge merkezi. */
export async function resolveVoraNeedLocation(
  visibility: VoraNeedVisibility,
  regionId: RegionId,
): Promise<LocationResult> {
  if (visibility === 'nearby') {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { error: 'Yakınlık ilanı için konum izni vermeniz gerekir.' };
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  }

  const device = await readDeviceLocation();
  if (device) return device;

  const center = regionMapCenter(regionId);
  return { latitude: center.latitude, longitude: center.longitude };
}
