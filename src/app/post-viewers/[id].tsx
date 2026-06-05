import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { UserBadge } from '@/features/feed/components/UserBadge';
import { fetchPostViewers, type ViewerFilter } from '@/features/feed/services/viewers';
import type { PostViewer } from '@/features/feed/services/viewers';
import { formatFeedTime } from '@/features/feed/utils';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

const FILTERS: { id: ViewerFilter; label: string }[] = [
  { id: 'recent', label: 'Son görüntüleyenler' },
  { id: 'followers', label: 'Takipçiler' },
  { id: 'all', label: 'Tümü' },
];

export default function PostViewersScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { id, authorId } = useLocalSearchParams<{ id: string; authorId: string }>();

  const [filter, setFilter] = useState<ViewerFilter>('recent');
  const [viewers, setViewers] = useState<PostViewer[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwner = user?.id === authorId;

  useEffect(() => {
    if (!id || !authorId) return;
    setLoading(true);
    fetchPostViewers(id, authorId, filter)
      .then(setViewers)
      .finally(() => setLoading(false));
  }, [id, authorId, filter]);

  if (!isOwner && !id?.startsWith('demo-')) {
    return (
      <GradientBackground>
        <View style={styles.page}>
          <AuthHeader title="Görüntüleyenler" subtitle="Erişim yok" />
          <Text secondary>Bu listeyi yalnızca gönderi sahibi görebilir.</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page}>
        <AuthHeader title="Görüntüleyenler" subtitle={`${viewers.length} kişi`} />

        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[
                styles.chip,
                {
                  borderColor: filter === f.id ? colors.primary : colors.border,
                  backgroundColor: filter === f.id ? 'rgba(30,136,229,0.12)' : colors.surface,
                },
              ]}
            >
              <Text variant="caption" style={{ color: filter === f.id ? colors.primary : colors.textSecondary }}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : viewers.length === 0 ? (
          <Text secondary>Henüz görüntüleyen yok.</Text>
        ) : (
          viewers.map((v) => (
            <View key={v.id} style={[styles.row, { borderColor: colors.border }]}>
              <UserBadge author={v.viewer} timeLabel={formatFeedTime(v.viewedAt)} />
              {v.isFollower ? (
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
