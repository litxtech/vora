import { CityLeaderPanelScreen } from '@/features/city-diplomacy/components/CityLeaderPanelScreen';
import { CityScreen } from '@/features/city-governance/components/CityScreen';
import { useCityOverview } from '@/features/city-governance/hooks/useCityOverview';
import { resolveCitySlug } from '@/features/city-governance/constants';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';

export default function CityLeaderRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const resolved = resolveCitySlug(typeof slug === 'string' ? slug : null);
  const { user } = useAuth();
  const { overview, loading } = useCityOverview(resolved, user?.id ?? null);

  if (!resolved) return <Redirect href="/(tabs)/discover" />;
  if (loading) return <View style={{ flex: 1 }}><ActivityIndicator /></View>;
  if (!overview || overview.myRole !== 'leader') return <CityScreen slug={resolved} />;

  return (
    <CityLeaderPanelScreen slug={resolved} regionId={overview.id} regionName={overview.name} />
  );
}
