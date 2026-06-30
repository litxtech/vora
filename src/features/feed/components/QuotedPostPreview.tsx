import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FeedMediaPreview } from '@/components/media/FeedMediaPreview';
import { Text } from '@/components/ui/Text';
import { FeedAuthorAvatar } from '@/features/feed/components/FeedAuthorAvatar';
import { HashtagText } from '@/features/feed/components/HashtagText';
import { navigateToFeedDetail } from '@/features/feed/services/feedNavigation';
import type { QuotedPostPreview as QuotedPost } from '@/features/feed/types';
import { formatFeedTime } from '@/features/feed/utils';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type QuotedPostPreviewProps = {
  quoted: QuotedPost;
  /** Detay sayfasında tam içerik ve medya göster */
  expanded?: boolean;
  /** false ise tıklama ve footer gizlenir (alıntı oluşturma önizlemesi) */
  interactive?: boolean;
};

const AVATAR_SIZE = 36;

export function QuotedPostPreview({ quoted, expanded = false, interactive = true }: QuotedPostPreviewProps) {
  const { colors } = useTheme();
  const displayName = quoted.authorFullName ?? `@${quoted.authorUsername}`;
  const hasMedia = quoted.mediaUrls.length > 0;
  const primaryMedia = quoted.mediaUrls[0] ?? null;
  const extraMedia = Math.max(0, quoted.mediaUrls.length - 1);

  const openQuoted = () => {
    navigateToFeedDetail('post', quoted.id, false);
  };

  const openAuthor = () => {
    if (quoted.authorId.startsWith('demo-')) return;
    router.push(`/u/${quoted.authorUsername}` as never);
  };

  const wrapStyle = [
    styles.wrap,
    interactive && styles.wrapInteractive,
    {
      borderColor: `${colors.primary}33`,
      backgroundColor: colors.surface,
    },
  ];

  const body = (
    <>
      <View style={[styles.topAccent, { backgroundColor: colors.primary }]} />

      <View style={styles.inner}>
        <View style={styles.sourceLabel}>
          <Ionicons name="chatbubble-ellipses-outline" size={12} color={colors.primary} />
          <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
            Alıntılanan gönderi
          </Text>
        </View>

        <Pressable
          onPress={interactive ? openAuthor : undefined}
          disabled={!interactive}
          style={styles.authorRow}
          hitSlop={4}
        >
          <FeedAuthorAvatar
            author={{
              avatarUrl: quoted.authorAvatarUrl,
              isVerified: quoted.authorIsVerified,
              isBusinessVerified: quoted.authorIsBusinessVerified,
              username: quoted.authorUsername,
              fullName: quoted.authorFullName,
            }}
            size={AVATAR_SIZE}
            showRing={false}
          />
          <View style={styles.authorMeta}>
            <View style={styles.nameRow}>
              <Text variant="label" numberOfLines={1} style={styles.authorName}>
                {displayName}
              </Text>
              {quoted.authorIsVerified ? (
                <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
              ) : null}
            </View>
            <Text secondary variant="caption" numberOfLines={1}>
              @{quoted.authorUsername}
              {quoted.createdAt ? ` · ${formatFeedTime(quoted.createdAt)}` : ''}
            </Text>
          </View>
        </Pressable>

        {quoted.title ? (
          <Text variant="label" style={styles.title} numberOfLines={expanded ? undefined : 2}>
            {quoted.title}
          </Text>
        ) : null}

        <View style={expanded ? undefined : styles.contentClamp}>
          {expanded ? (
            <HashtagText content={quoted.content} />
          ) : (
            <Text numberOfLines={4} variant="body" style={styles.content}>
              {quoted.content}
            </Text>
          )}
        </View>

        {hasMedia && primaryMedia ? (
          <View style={styles.mediaWrap}>
            <FeedMediaPreview
              url={primaryMedia}
              style={[styles.media, expanded && styles.mediaExpanded]}
              showPlayIcon
              tier="feed"
            />
            {extraMedia > 0 ? (
              <View style={[styles.mediaCount, { backgroundColor: `${colors.background}CC` }]}>
                <Text variant="caption" style={{ fontWeight: '700' }}>
                  +{extraMedia}
                </Text>
              </View>
            ) : null}
            {isVideoUrl(primaryMedia) ? (
              <View style={styles.videoBadge}>
                <Ionicons name="play" size={12} color="#fff" />
              </View>
            ) : null}
          </View>
        ) : null}

        {interactive ? (
          <View style={styles.footer}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              Orijinal gönderiyi gör
            </Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </View>
        ) : null}
      </View>
    </>
  );

  if (!interactive) {
    return <View style={wrapStyle}>{body}</View>;
  }

  return (
    <Pressable
      onPress={openQuoted}
      style={({ pressed }) => [
        wrapStyle,
        pressed && { backgroundColor: `${colors.primary}08` },
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  wrapInteractive: {
    marginTop: spacing.sm,
  },
  topAccent: {
    height: 2,
    width: '100%',
  },
  inner: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  sourceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorMeta: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  authorName: {
    fontWeight: '700',
    flexShrink: 1,
  },
  title: {
    letterSpacing: -0.1,
  },
  contentClamp: {
    maxHeight: 88,
    overflow: 'hidden',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  mediaWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  media: {
    width: '100%',
    height: 140,
    borderRadius: radius.md,
  },
  mediaExpanded: {
    height: 220,
  },
  mediaCount: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  videoBadge: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
});
