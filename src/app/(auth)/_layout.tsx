import { Stack } from 'expo-router';
import { getDefaultStackScreenOptions } from '@/constants/navigation';

export default function AuthLayout() {
  return (
    <Stack screenOptions={getDefaultStackScreenOptions()}>
      <Stack.Screen name="login" />
      <Stack.Screen name="login-code" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="convert-account" />
      <Stack.Screen name="guest-setup" options={{ gestureEnabled: false }} />
      <Stack.Screen name="legal" />
      <Stack.Screen name="account-access" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
