import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { getDefaultStackScreenOptions } from '@/constants/navigation';

export default function PersonnelCenterLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={getDefaultStackScreenOptions({
        contentStyle: { backgroundColor: colors.background },
      })}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create-job" />
      <Stack.Screen name="create-staff" />
      <Stack.Screen name="edit-job/[id]" />
      <Stack.Screen name="edit-staff/[id]" />
      <Stack.Screen name="application/[id]" options={{ title: 'Başvuru Detayı' }} />
    </Stack>
  );
}
