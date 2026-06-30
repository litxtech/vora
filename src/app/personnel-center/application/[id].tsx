import { useLocalSearchParams } from 'expo-router';
import { EmployerApplicationDetailScreen } from '@/features/personnel-center/components/EmployerApplicationDetailScreen';

export default function EmployerApplicationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <EmployerApplicationDetailScreen applicationId={id} />;
}
