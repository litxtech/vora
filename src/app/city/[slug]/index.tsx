import { CityScreen } from '@/features/city-governance/components/CityScreen';
import { resolveCitySlug } from '@/features/city-governance/constants';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CityRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const resolved = resolveCitySlug(typeof slug === 'string' ? slug : null);

  if (!resolved) {
    return <Redirect href="/(tabs)/discover" />;
  }

  return <CityScreen slug={resolved} />;
}
