import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AiMusicProgress } from '@/features/ai-music/components/AiMusicProgress';
import { fetchGeneratingAiMusic } from '@/features/ai-music/services/aiMusicData';
import { aiMusicJobsArmed, subscribeAiMusicJobs } from '@/features/ai-music/services/aiMusicJobs';
import type { AiMusicWork } from '@/features/ai-music/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function AiMusicJobBanner() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<AiMusicWork[]>([]);

  useEffect(() => {
    if (!user) {
      setJobs([]);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      const next = await fetchGeneratingAiMusic(user.id);
      if (cancelled) return;
      setJobs(next);
      timer = setTimeout(tick, next.length > 0 || aiMusicJobsArmed() ? 2000 : 30000);
    };

    void tick();
    const unsubscribe = subscribeAiMusicJobs(() => {
      if (timer) clearTimeout(timer);
      void tick();
    });
    return () => {
      cancelled = true;
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [user]);

  const current = jobs[0];
  if (!current) return null;

  return (
    <Pressable
      onPress={() => router.push(`/sounds/ai/${current.id}` as Href)}
      style={[
        styles.banner,
        {
          backgroundColor: colors.surface,
          borderColor: colors.accent,
          bottom: insets.bottom + 74,
        },
      ]}
    >
      <Ionicons name="sparkles" size={18} color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontWeight: '700' }}>
          {jobs.length > 1 ? `${jobs.length} parça hazırlanıyor` : current.title}
        </Text>
        <AiMusicProgress stage={current.stage} progress={current.progress} compact />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    zIndex: 20,
  },
});
