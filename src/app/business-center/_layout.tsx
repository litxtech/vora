import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { getDefaultStackScreenOptions } from '@/constants/navigation';

export default function BusinessCenterLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={getDefaultStackScreenOptions({
        contentStyle: { backgroundColor: colors.background },
      })}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="shop/[businessId]" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="pending" />
      <Stack.Screen name="create-product" />
      <Stack.Screen name="shop-curate" />
      <Stack.Screen name="shop-boost" />
    </Stack>
  );
}
