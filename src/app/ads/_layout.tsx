import { Stack } from 'expo-router';
import { getDefaultStackScreenOptions } from '@/constants/navigation';
import { useTheme } from '@/providers/ThemeProvider';

export default function AdsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={getDefaultStackScreenOptions({
        contentStyle: { backgroundColor: colors.background },
      })}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="studio" />
      <Stack.Screen name="policy" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
