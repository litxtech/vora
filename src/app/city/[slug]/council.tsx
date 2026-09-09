import { CityCouncilScreen } from '@/features/city-governance/components/CityCouncilScreen';
import { resolveCitySlug } from '@/features/city-governance/constants';
import { useCityOverview } from '@/features/city-governance/hooks/useCityOverview';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';

export default function CityCouncilRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const resolved = resolveCitySlug(typeof slug === 'string' ? slug : null);
  const { user } = useAuth();
  const { overview, loading } = useCityOverview(resolved, user?.id ?? null);

  if (!resolved) return <Redirect href="/(tabs)/discover" />;
  if (loading || !overview) {
    return <View style={{ flex: 1 }}><ActivityIndicator /></View>;
  }

  return (
    <CityCouncilScreen
      slug={overview.slug}
      regionId={overview.id}
      regionName={overview.name}
      isLeader={overview.myRole === 'leader'}
    />
  );
}
