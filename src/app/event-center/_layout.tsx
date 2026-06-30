import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { getDefaultStackScreenOptions, resolveStackAnimation } from '@/constants/navigation';

export default function EventCenterLayout() {
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
      <Stack.Screen name="scan" options={{ animation: resolveStackAnimation('slide_from_bottom') }} />
    </Stack>
  );
}
