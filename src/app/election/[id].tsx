import { CityElectionScreen } from '@/features/city-governance/components/CityElectionScreen';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ElectionDeepLinkRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id || typeof id !== 'string') {
    return <Redirect href="/(tabs)/discover" />;
  }
  return <CityElectionScreen electionId={id} />;
}
