import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { getDefaultStackScreenOptions } from '@/constants/navigation';

export default function PlatformGuideLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={getDefaultStackScreenOptions({
        contentStyle: { backgroundColor: colors.background },
      })}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[slug]" />
    </Stack>
  );
}
