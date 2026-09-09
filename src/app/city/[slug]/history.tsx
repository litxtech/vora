import { CityHistoryScreen } from '@/features/city-governance/components/CityHistoryScreen';
import { resolveCitySlug } from '@/features/city-governance/constants';
import { useCityOverview } from '@/features/city-governance/hooks/useCityOverview';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';

export default function CityHistoryRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const resolved = resolveCitySlug(typeof slug === 'string' ? slug : null);
  const { user } = useAuth();
  const { overview, loading } = useCityOverview(resolved, user?.id ?? null);

  if (!resolved) return <Redirect href="/(tabs)/discover" />;
  if (loading || !overview) {
    return <View style={{ flex: 1 }}><ActivityIndicator /></View>;
  }

  return <CityHistoryScreen slug={overview.slug} regionId={overview.id} regionName={overview.name} />;
}
