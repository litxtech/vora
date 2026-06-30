import { Stack } from 'expo-router';
import { getDefaultStackScreenOptions, resolveStackAnimation } from '@/constants/navigation';

export default function CallLayout() {
  return (
    <Stack
      screenOptions={getDefaultStackScreenOptions({
        presentation: 'fullScreenModal',
        animation: resolveStackAnimation('fade'),
        contentStyle: { backgroundColor: '#0A0E14' },
      })}
    />
  );
}
