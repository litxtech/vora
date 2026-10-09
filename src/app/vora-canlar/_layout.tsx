import { Stack } from 'expo-router';
import { getDefaultStackScreenOptions } from '@/constants/navigation';
import { useTheme } from '@/providers/ThemeProvider';

export default function VoraCanlarLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={getDefaultStackScreenOptions({
        contentStyle: { backgroundColor: colors.background },
      })}
    />
  );
}
