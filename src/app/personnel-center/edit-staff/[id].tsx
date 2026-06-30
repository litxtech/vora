import { useLocalSearchParams } from 'expo-router';
import { CreateStaffScreen } from '@/features/personnel-center/components/CreateStaffScreen';

export default function EditStaffPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CreateStaffScreen editStaffId={id} />;
}
