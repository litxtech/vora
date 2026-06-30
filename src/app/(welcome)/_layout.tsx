import { Stack } from 'expo-router';
import { getDefaultStackScreenOptions, resolveStackAnimation } from '@/constants/navigation';

export default function WelcomeLayout() {
  return (
    <Stack screenOptions={getDefaultStackScreenOptions()}>
      <Stack.Screen name="intro" options={{ animation: resolveStackAnimation('fade') }} />
      <Stack.Screen name="lobby" />
    </Stack>
  );
}
