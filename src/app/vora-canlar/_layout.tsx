import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { getDefaultStackScreenOptions } from '@/constants/navigation';
import { CanlarUserSheetProvider } from '@/features/vora-canlar/components/CanlarUserSheet';
import { refreshCanlarHome } from '@/features/vora-canlar/services/sessionCache';
import { useTheme } from '@/providers/ThemeProvider';

export default function VoraCanlarLayout() {
  const { colors } = useTheme();
  useEffect(() => {
    void refreshCanlarHome();
  }, []);
  return (
    <CanlarUserSheetProvider>
      <Stack
        screenOptions={getDefaultStackScreenOptions({
          contentStyle: { backgroundColor: colors.background },
        })}
      />
    </CanlarUserSheetProvider>
  );
}
