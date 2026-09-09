import { CityElectionScreen } from '@/features/city-governance/components/CityElectionScreen';
import { useLocalSearchParams } from 'expo-router';

export default function CityElectionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id || typeof id !== 'string') return null;
  return <CityElectionScreen electionId={id} />;
}
