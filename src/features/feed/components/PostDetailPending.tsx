import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DetailLoadingShell } from '@/components/ui/DetailLoadingShell';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import type { FeedItem } from '@/features/feed/types';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PostDetailPendingProps = {
  item: FeedItem | null;
  title?: string;
};

function authorLabel(item: FeedItem): string {
  return item.author.displayName || item.author.fullName || item.author.username;
}

/**
 * Detay chunk'ı ve ağ cevabı gelene kadar boş ekran yerine gönderinin kendisi.
 */
export function PostDetailPending({ item, title = 'Gönderi' }: PostDetailPendingProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  if (!item) return <DetailLoadingShell gradient />;

  const previewUrl = item.mediaUrls.find((url) => url && !isVideoUrl(url)) ?? null;
  const hasVideo = item.mediaUrls.some((url) => isVideoUrl(url));

  return (
    <GradientBackground>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <ScreenBackButton />
        <View style={styles.headerCopy}>
          <Text variant="label">{title}</Text>
          <Text secondary variant="caption">
            @{item.author.username}
          </Text>
        </View>
        <View style={styles.shareBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}
      >
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.post}>
              <View style={styles.authorRow}>
                {item.author.avatarUrl ? (
                  <Image source={{ uri: item.author.avatarUrl }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.border }]}>
                    <Ionicons name="person" size={16} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.authorCopy}>
                  <Text variant="label" numberOfLines={1}>
                    {authorLabel(item)}
                  </Text>
                  <Text secondary variant="caption" numberOfLines={1}>
                    @{item.author.username}
                  </Text>
                </View>
              </View>

              {item.title ? <Text variant="label">{item.title}</Text> : null}
              {item.content ? (
                <Text style={styles.content} numberOfLines={8}>
                  {item.content}
                </Text>
              ) : null}

              {previewUrl ? (
                <Image source={{ uri: previewUrl }} style={styles.media} contentFit="cover" />
              ) : hasVideo ? (
                <View style={[styles.media, styles.videoFallback, { backgroundColor: colors.border }]}>
                  <Ionicons name="play" size={28} color={colors.text} />
                </View>
              ) : null}
          </View>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
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
  },
  scroll: {
    padding: spacing.md,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  post: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorCopy: {
    flex: 1,
    gap: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    lineHeight: 22,
  },
  media: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    marginTop: spacing.xs,
  },
  videoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
