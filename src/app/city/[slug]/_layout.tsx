import { Stack } from 'expo-router';

export default function CityLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="leader" />
      <Stack.Screen name="diplomacy" />
      <Stack.Screen name="council" />
      <Stack.Screen name="history" />
      <Stack.Screen name="election/[id]" />
    </Stack>
  );
}
