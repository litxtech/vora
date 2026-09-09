import { useLocalSearchParams } from 'expo-router';
import { DateDetailScreen } from '@/features/date';

export default function DateDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <DateDetailScreen outingId={id} />;
}
