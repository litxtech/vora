import { CityDiplomacyScreen } from '@/features/city-diplomacy/components/CityDiplomacyScreen';
import { CityScreen } from '@/features/city-governance/components/CityScreen';
import { resolveCitySlug } from '@/features/city-governance/constants';
import { useCityOverview } from '@/features/city-governance/hooks/useCityOverview';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';

export default function CityDiplomacyRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const resolved = resolveCitySlug(typeof slug === 'string' ? slug : null);
  const { user } = useAuth();
  const { overview, loading } = useCityOverview(resolved, user?.id ?? null);

  if (!resolved) return <Redirect href="/(tabs)/discover" />;
  if (loading) return <View style={{ flex: 1 }}><ActivityIndicator /></View>;
  if (!overview) return <CityScreen slug={resolved} />;

  return <CityDiplomacyScreen slug={overview.slug} regionId={overview.id} regionName={overview.name} />;
}
