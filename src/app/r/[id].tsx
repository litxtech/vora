import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { openReelById } from '@/features/reels/services/reelsNavigation';
import { useTheme } from '@/providers/ThemeProvider';

export default function ReelShareLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  useEffect(() => {
    if (!id) {
      router.replace('/(tabs)/reels' as never);
      return;
    }
    openReelById(id);
  }, [id]);

  return (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
