import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { resolveCitySlug } from '@/features/city-governance/constants';
import { useAuth } from '@/providers/AuthProvider';
import type { RegionId } from '@/constants/regions';

const DEFAULT_CITY_SLUG: RegionId = 'trabzon';

export default function CityIndexRoute() {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const slug =
    resolveCitySlug((profile as { primary_city_id?: string | null } | null)?.primary_city_id) ??
    resolveCitySlug(profile?.region_id ?? null) ??
    DEFAULT_CITY_SLUG;

  return <Redirect href={`/city/${slug}`} />;
}
