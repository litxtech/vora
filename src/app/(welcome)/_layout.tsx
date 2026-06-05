import { Stack } from 'expo-router';

export default function WelcomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="lobby" />
    </Stack>
  );
}
