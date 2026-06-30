import { Stack } from 'expo-router';
import { getDefaultStackScreenOptions } from '@/constants/navigation';

export default function DetailLayout() {
  return (
    <Stack screenOptions={getDefaultStackScreenOptions()}>
      <Stack.Screen name="incidents/[id]" />
      <Stack.Screen name="posts/[id]" />
      <Stack.Screen name="businesses/[id]" />
      <Stack.Screen name="events/[id]" />
      <Stack.Screen name="lost-found/[id]" />
      <Stack.Screen name="jobs/[id]" />
      <Stack.Screen name="staff/[id]" />
      <Stack.Screen name="job-seekers/[id]" />
      <Stack.Screen name="traffic/[id]" />
      <Stack.Screen name="tourism/[id]" />
      <Stack.Screen name="marketplace/[id]" />
      <Stack.Screen name="rides/[id]" />
      <Stack.Screen name="vora-needs/[id]" />
      <Stack.Screen name="vora-hizmetler/request/[id]" />
      <Stack.Screen name="vora-hizmetler/provider/[id]" />
      <Stack.Screen name="help-requests/[id]" />
      <Stack.Screen name="volunteer-teams/[id]" />
    </Stack>
  );
}
