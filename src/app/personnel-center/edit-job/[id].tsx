import { useLocalSearchParams } from 'expo-router';
import { CreateJobScreen } from '@/features/personnel-center/components/CreateJobScreen';

export default function EditJobPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CreateJobScreen editJobId={id} />;
}
