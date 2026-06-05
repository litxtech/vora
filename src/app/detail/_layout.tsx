import { Stack } from 'expo-router';

export default function DetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="incidents/[id]" />
      <Stack.Screen name="posts/[id]" />
      <Stack.Screen name="businesses/[id]" />
      <Stack.Screen name="events/[id]" />
      <Stack.Screen name="lost-found/[id]" />
      <Stack.Screen name="jobs/[id]" />
      <Stack.Screen name="staff/[id]" />
      <Stack.Screen name="job-seekers/[id]" />
      <Stack.Screen name="emergency-pois/[id]" />
    </Stack>
  );
}
