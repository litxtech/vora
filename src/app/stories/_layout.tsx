import { Stack } from 'expo-router';

export default function StoriesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#000' },
      }}
    />
  );
}
