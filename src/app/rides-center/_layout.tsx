import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { getDefaultStackScreenOptions, resolveStackAnimation } from '@/constants/navigation';

export default function RidesCenterLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={getDefaultStackScreenOptions({
        contentStyle: { backgroundColor: colors.background },
      })}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="create" />
      <Stack.Screen name="my-trips" />
      <Stack.Screen name="reservations" />
      <Stack.Screen name="refund-request" />
      <Stack.Screen name="vehicle/index" />
      <Stack.Screen name="vehicle/add" />
      <Stack.Screen name="vehicle/edit" />
      <Stack.Screen name="live/[id]" />
      <Stack.Screen
        name="route-preview"
        options={{
          animation: resolveStackAnimation('slide_from_bottom'),
          presentation: 'fullScreenModal',
        }}
      />
    </Stack>
  );
}
