import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useOnboardingGuard } from '@/features/auth/hooks/useRouteGuard';
import { useTheme } from '@/providers/ThemeProvider';

export default function OnboardingLayout() {
  const { colors } = useTheme();
  const guard = useOnboardingGuard();

  if (guard.status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (guard.status === 'redirect') {
    return <Redirect href={guard.href} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="location" />
    </Stack>
  );
}
