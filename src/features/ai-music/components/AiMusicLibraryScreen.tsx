import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { AiMusicProgress } from '@/features/ai-music/components/AiMusicProgress';
import { aiMusicStyleLabel, formatAiMusicAllowance, formatAiMusicClock } from '@/features/ai-music/constants';
import { fetchMyAiMusic } from '@/features/ai-music/services/aiMusicData';
import { fetchAiMusicBalance } from '@/features/ai-music/services/aiMusicMinutes';
import type { AiMusicBalance, AiMusicWork } from '@/features/ai-music/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const STATUS_LABEL: Record<string, string> = {
  generating: 'Hazırlanıyor',
  ready: 'Hazır',
  published: 'Kütüphanede',
  failed: 'Tamamlanamadı',
};

export function AiMusicLibraryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [works, setWorks] = useState<AiMusicWork[]>([]);
  const [balance, setBalance] = useState<AiMusicBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setWorks([]);
      setBalance(null);
      setLoading(false);
      return;
    }
    const [next, allowance] = await Promise.all([fetchMyAiMusic(user.id), fetchAiMusicBalance()]);
    setWorks(next);
    setBalance(allowance);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => {
        void load();
      }, 4000);
      return () => clearInterval(timer);
    }, [load]),
  );

  return (
    <GradientBackground>
      <View style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.topBar}>
          <ScreenBackButton />
          <Text variant="label">Müziklerim</Text>
          <Pressable
            onPress={() => router.push((balance && balance.availableSec <= 0 ? '/sounds/ai/packages' : '/sounds/ai/new') as Href)}
            hitSlop={10}
            style={styles.iconBtn}
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </Pressable>
        </View>

        {loading && works.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
            <Pressable
              onPress={() => router.push('/sounds/ai/packages' as Href)}
              style={[styles.allowance, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="time-outline" size={16} color={colors.accent} />
              <Text style={{ flex: 1 }}>
                {balance ? `${formatAiMusicAllowance(balance.availableSec)} hak` : 'Hak okunuyor'}
              </Text>
              <Text variant="caption" style={{ color: colors.accent, fontWeight: '700' }}>Paket al</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push((balance && balance.availableSec <= 0 ? '/sounds/ai/packages' : '/sounds/ai/new') as Href)}
              style={styles.heroWrap}
            >
              <LinearGradient colors={['#0B3A4A', '#0E7490', '#14B8A6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
                <Text style={styles.heroKicker}>Vora Müzik</Text>
                <Text style={styles.heroTitle}>Yeni parça</Text>
                <Text style={styles.heroBody}>Prompt yaz, üret. Dakika onayda düşer.</Text>
              </LinearGradient>
            </Pressable>

            {works.length === 0 ? (
              <View style={styles.center}>
                <Ionicons name="musical-notes-outline" size={36} color={colors.textMuted} />
                <Text secondary style={{ textAlign: 'center' }}>
                  Ürettiğin parçalar bu sayfada toplanır.
                </Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: spacing.md }}>
                {works.map((work) => (
                  <Pressable
                    key={work.id}
                    onPress={() => router.push(`/sounds/ai/${work.id}` as Href)}
                    style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={styles.cardTop}>
                      {work.coverUrl ? (
                        <Image source={{ uri: work.coverUrl }} style={styles.cover} />
                      ) : (
                        <LinearGradient colors={['#0B3A4A', '#14B8A6']} style={styles.cover}>
                          <Ionicons name="musical-notes" size={18} color="#F8FAFC" />
                        </LinearGradient>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontWeight: '700' }}>{work.title}</Text>
                        <Text secondary variant="caption">
                          {STATUS_LABEL[work.status] ?? work.status}
                          {work.approvedAt && work.status === 'ready' ? ' · Onaylı' : ''}
                          {' · '}
                          {aiMusicStyleLabel(work.style)}
                        </Text>
                        <View style={[styles.durationPill, { backgroundColor: `${colors.accent}16` }]}>
                          <Ionicons name="time-outline" size={12} color={colors.accent} />
                          <Text variant="caption" style={{ color: colors.accent, fontWeight: '700' }}>
                            {formatAiMusicAllowance(work.durationSec)} · {formatAiMusicClock(work.durationSec)}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </View>
                    {work.status === 'generating' ? (
                      <AiMusicProgress stage={work.stage} progress={work.progress} compact />
                    ) : null}
                    {work.status === 'failed' && work.errorMessage ? (
                      <Text variant="caption" style={{ color: colors.danger }} numberOfLines={2}>
                        {work.errorMessage}
                      </Text>
                    ) : null}
                    {work.status === 'published' ? (
                      <Text secondary variant="caption">
                        {work.accountUsageCount} hesap · {work.shareCount} paylaşım
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  allowance: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroWrap: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  hero: { borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 2 },
  heroKicker: { color: '#CCFBF1', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  heroTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '800' },
  heroBody: { color: '#E6FFFA', fontSize: 13 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cover: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  durationPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
});
