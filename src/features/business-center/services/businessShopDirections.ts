import { Alert } from 'react-native';
import type { RegionId } from '@/constants/regions';
import type { BusinessAccountRecord } from '@/features/business-center/types';
import { openMapDirections } from '@/features/map/services/openMapDirections';
import { resolvePlaceCoordinates } from '@/features/map/services/resolvePlaceCoordinates';

export async function openBusinessShopDirections(business: BusinessAccountRecord): Promise<void> {
  let latitude = business.latitude;
  let longitude = business.longitude;

  if (latitude == null || longitude == null) {
    const query = [business.name, business.address, business.district].filter(Boolean).join(', ');
    if (!query.trim()) {
      Alert.alert('Konum', 'Bu işletme için konum bilgisi bulunamadı.');
      return;
    }

    const resolved = await resolvePlaceCoordinates({
      label: query,
      regionId: business.regionId as RegionId,
      geocodeHint: business.address ?? undefined,
    });

    if (!resolved) {
      Alert.alert('Konum', 'İşletme konumu bulunamadı.');
      return;
    }

    latitude = resolved.latitude;
    longitude = resolved.longitude;
  }

  openMapDirections({
    latitude,
    longitude,
    label: business.name,
    subtitle: [business.address, business.district].filter(Boolean).join(', ') || undefined,
    layer: 'businesses',
    sourceId: business.id,
  });
}
