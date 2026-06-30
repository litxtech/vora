import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { getDefaultStackScreenOptions } from '@/constants/navigation';

export default function LostCenterLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={getDefaultStackScreenOptions({
        contentStyle: { backgroundColor: colors.background },
      })}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="edit/[id]" />
    </Stack>
  );
}
