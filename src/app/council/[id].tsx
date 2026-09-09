import { CouncilSessionScreen } from '@/features/city-governance/components/CouncilSessionScreen';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CouncilRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id || typeof id !== 'string') return <Redirect href="/(tabs)/discover" />;
  return <CouncilSessionScreen sessionId={id} />;
}
