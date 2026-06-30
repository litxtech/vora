import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { getDefaultStackScreenOptions } from '@/constants/navigation';

export default function MarketplaceCenterLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={getDefaultStackScreenOptions({
        contentStyle: { backgroundColor: colors.background },
      })}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="my-listings" />
      <Stack.Screen name="offers" />
      <Stack.Screen name="create" />
      <Stack.Screen name="edit/[id]" />
      <Stack.Screen name="buyer" />
      <Stack.Screen name="seller" />
      <Stack.Screen name="payout-profile" />
      <Stack.Screen name="order/[id]" />
    </Stack>
  );
}
