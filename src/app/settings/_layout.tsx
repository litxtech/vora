import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { getDefaultStackScreenOptions } from '@/constants/navigation';

export default function SettingsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={getDefaultStackScreenOptions({
        contentStyle: { backgroundColor: colors.background },
      })}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="job-seeker" />
      <Stack.Screen name="account" />
      <Stack.Screen name="security" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="premium" />
      <Stack.Screen name="contribute" />
      <Stack.Screen name="messaging" />
      <Stack.Screen name="insights" />
      <Stack.Screen name="identity-verification" />
      <Stack.Screen name="platform-guide" />
      <Stack.Screen name="share-app" />
      <Stack.Screen name="screen-time" />
      <Stack.Screen name="invite-center" />
      <Stack.Screen name="business-application" />
      <Stack.Screen name="link-business-account" />
    </Stack>
  );
}
