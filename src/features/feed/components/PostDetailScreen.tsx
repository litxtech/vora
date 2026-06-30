import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { CommentSheet } from '@/features/feed/components/CommentSheet';
import { FeedPostCard } from '@/features/feed/components/FeedPostCard';
import { PostShareSheet } from '@/features/feed/components/PostShareSheet';
import { fetchFeedPostById } from '@/features/feed/services/feedData';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { FEED_FEATURE } from '@/features/feed/featureFlags';
import type { FeedItem } from '@/features/feed/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function PostDetailScreen() {
  const { id, demo, focusVideo, mediaIndex } = useLocalSearchParams<{
    id: string;
    demo?: string;
    focusVideo?: string;
    mediaIndex?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [item, setItem] = useState<FeedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const showDetailShare = useFeatureVisible(FEED_FEATURE.postDetailShare);
  const showDetailComments = useFeatureVisible(FEED_FEATURE.postDetailComments);

  const load = useCallback(async () => {
    if (!id || demo === '1') {
      setError('Gönderi bulunamadı.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const post = await fetchFeedPostById(id, user?.id ?? null);
    if (!post) {
      setError('Gönderi bulunamadı veya kaldırılmış.');
      setItem(null);
    } else {
      setItem(post);
    }
    setLoading(false);
  }, [id, demo, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpdate = useCallback((patch: Partial<FeedItem>) => {
    setItem((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const handleDeleted = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    setItem(null);
    setError('Gönderi kaldırıldı.');
  }, []);

  const parsedMediaIndex = mediaIndex ? Math.max(0, Number.parseInt(mediaIndex, 10) || 0) : 0;

  if (loading) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (error || !item) {
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.md }]}>
          <ScreenBackButton />
          <GlassCard style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
            <Text variant="label">Gönderi bulunamadı</Text>
            <Text secondary variant="caption" style={{ textAlign: 'center' }}>
              {error ?? 'Bu gönderi kaldırılmış veya erişilemiyor olabilir.'}
            </Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <ScreenBackButton />
        <View style={styles.headerCopy}>
          <Text variant="label">Gönderi</Text>
          {item.quotedPost ? (
            <Text secondary variant="caption">
              Alıntı · @{item.author.username}
            </Text>
          ) : (
            <Text secondary variant="caption">
              @{item.author.username}
            </Text>
          )}
        </View>
        {showDetailShare ? (
          <Pressable onPress={() => setShowShare(true)} hitSlop={8} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.shareBtn} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <GlassCard style={styles.postCard} padded={false}>
          <FeedPostCard
            item={item}
            mode="detail"
            isScreenFocused
            isRowVisible
            focusVideo={focusVideo === '1'}
            initialMediaIndex={parsedMediaIndex}
            onUpdate={handleUpdate}
            onDeleted={handleDeleted}
          />
        </GlassCard>

        <View style={styles.statsRow}>
          <StatChip icon="heart-outline" label={`${item.likeCount.toLocaleString('tr-TR')} beğeni`} />
          <StatChip icon="chatbubble-outline" label={`${item.commentCount.toLocaleString('tr-TR')} yorum`} />
          <StatChip icon="repeat-outline" label={`${item.quoteCount.toLocaleString('tr-TR')} alıntı`} />
        </View>

        {showDetailComments ? (
          <Pressable
            onPress={() => setShowComments(true)}
            style={[styles.commentsCta, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <View style={[styles.commentsIcon, { backgroundColor: `${colors.primary}14` }]}>
              <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.commentsCopy}>
              <Text variant="label">Yorumlar</Text>
              <Text secondary variant="caption">
                {item.commentCount > 0
                  ? `${item.commentCount} yorumu görüntüle`
                  : 'İlk yorumu sen yap'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}

        {item.viewCount > 0 ? (
          <Text secondary variant="caption" style={styles.views}>
            {item.viewCount.toLocaleString('tr-TR')} görüntülenme
          </Text>
        ) : null}
      </ScrollView>

      <CommentSheet
        visible={showComments}
        postId={item.sourceId}
        postAuthorId={item.author.id}
        onClose={() => setShowComments(false)}
        onCommentAdded={() => handleUpdate({ commentCount: item.commentCount + 1 })}
        onCommentDeleted={() => handleUpdate({ commentCount: Math.max(0, item.commentCount - 1) })}
      />

      <PostShareSheet visible={showShare} item={item} onClose={() => setShowShare(false)} />
    </GradientBackground>
  );
}

function StatChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text variant="caption" secondary>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 1,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
  },
  postCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  commentsCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  commentsIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  commentsCopy: {
    flex: 1,
    gap: 2,
  },
  views: {
    textAlign: 'center',
    paddingTop: spacing.xs,
  },
});
