import { Stack } from 'expo-router';

export default function StoriesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#000' },
      }}
    >
      <Stack.Screen name="upload-status" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
