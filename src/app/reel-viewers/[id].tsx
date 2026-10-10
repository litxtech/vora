import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { canAdmin } from '@/constants/roles';
import { UserBadge } from '@/features/feed/components/UserBadge';
import { formatFeedTime } from '@/features/feed/utils';
import { fetchReelViewers, type ReelViewer, type ReelViewerFilter } from '@/features/reels/services/reelViewers';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

const FILTERS: { id: ReelViewerFilter; label: string }[] = [
  { id: 'recent', label: 'Son görüntüleyenler' },
  { id: 'followers', label: 'Takipçiler' },
  { id: 'all', label: 'Tümü' },
];

export default function ReelViewersScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { id, authorId } = useLocalSearchParams<{ id: string; authorId: string }>();

  const [filter, setFilter] = useState<ReelViewerFilter>('recent');
  const [viewers, setViewers] = useState<ReelViewer[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwner = user?.id === authorId;
  const isAdmin = Boolean(profile?.role && canAdmin(profile.role));

  useEffect(() => {
    if (!id || !authorId || (!isOwner && !isAdmin)) return;
    setLoading(true);
    fetchReelViewers(id, authorId, filter, isAdmin)
      .then(setViewers)
      .finally(() => setLoading(false));
  }, [id, authorId, filter, isOwner, isAdmin]);

  if (!isOwner && !isAdmin) {
    return (
      <GradientBackground>
        <View style={styles.page}>
          <AuthHeader title="Reel görüntüleyenler" subtitle="Erişim yok" />
          <Text secondary>Bu listeyi reel sahibi ve admin hesapları görebilir.</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page}>
        <AuthHeader title="Reel görüntüleyenler" subtitle={`${viewers.length} kişi`} />

        <View style={styles.filters}>
          {FILTERS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setFilter(item.id)}
              style={[
                styles.chip,
                {
                  borderColor: filter === item.id ? colors.primary : colors.border,
                  backgroundColor: filter === item.id ? 'rgba(30,136,229,0.12)' : colors.surface,
                },
              ]}
            >
              <Text variant="caption" style={{ color: filter === item.id ? colors.primary : colors.textSecondary }}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : viewers.length === 0 ? (
          <Text secondary>Henüz görüntüleyen yok.</Text>
        ) : (
          viewers.map((viewer) => (
            <View key={viewer.id} style={[styles.row, { borderColor: colors.border }]}>
              <UserBadge author={viewer.viewer} timeLabel={formatFeedTime(viewer.viewedAt)} />
              {viewer.isFollower ? (
                <Text variant="caption" style={{ color: colors.primary }}>
                  Takipçi
                </Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
  },
});
