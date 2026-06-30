import { Redirect, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BOOT_SPLASH_BACKGROUND } from '@/components/splash';
import { useOnboardingGuard } from '@/features/auth/hooks/useRouteGuard';
import { getDefaultStackScreenOptions } from '@/constants/navigation';

export default function OnboardingLayout() {
  const guard = useOnboardingGuard();

  if (guard.status === 'loading') {
    return <View style={styles.bootPlaceholder} />;
  }

  if (guard.status === 'redirect') {
    return <Redirect href={guard.href} />;
  }

  return (
    <Stack screenOptions={getDefaultStackScreenOptions()}>
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="location" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  bootPlaceholder: {
    flex: 1,
    backgroundColor: BOOT_SPLASH_BACKGROUND,
  },
});
