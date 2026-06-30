import { Stack } from 'expo-router';
import { getDefaultStackScreenOptions } from '@/constants/navigation';

export default function AdminSupportLayout() {
  return <Stack screenOptions={getDefaultStackScreenOptions()} />;
}
