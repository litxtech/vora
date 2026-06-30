import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MarketplaceCommentMediaViewer } from '@/features/marketplace/components/MarketplaceCommentMediaViewer';
import { isVideoUrl } from '@/features/marketplace/services/descriptionBlocks';
import { formatMarketplaceDate, MARKETPLACE_ACCENT } from '@/features/marketplace/constants';
import type { MarketplaceComment } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  comment: MarketplaceComment;
};

const THUMB_SIZE = 56;

export function MarketplaceCommentRow({ comment }: Props) {
  const { colors } = useTheme();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openMedia = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  return (
    <View style={[styles.bubble, { backgroundColor: `${colors.surface}99`, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text variant="caption" style={styles.author}>
          {comment.authorName ?? comment.authorUsername ?? 'Kullanıcı'}
        </Text>
        {comment.isSeller ? (
          <View style={[styles.badge, { backgroundColor: `${MARKETPLACE_ACCENT}18` }]}>
            <Text variant="caption" style={{ color: MARKETPLACE_ACCENT, fontWeight: '700' }}>
              Satıcı
            </Text>
          </View>
        ) : null}
        {comment.commentKind === 'buyer_proof' ? (
          <View style={[styles.badge, { backgroundColor: `${colors.success}18` }]}>
            <Ionicons name="bag-check-outline" size={10} color={colors.success} />
            <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
              Alıcı paylaşımı
            </Text>
          </View>
        ) : null}
        <Text secondary variant="caption" style={{ marginLeft: 'auto' }}>
          {formatMarketplaceDate(comment.createdAt)}
        </Text>
      </View>

      {comment.body.trim() && comment.body !== 'Medya paylaşımı' ? (
        <Text variant="caption" style={styles.body}>
          {comment.body}
        </Text>
      ) : null}

      {comment.mediaUrls.length ? (
        <View style={styles.mediaGrid}>
          {comment.mediaUrls.map((url, index) => (
            <Pressable key={`${url}-${index}`} onPress={() => openMedia(index)} style={styles.mediaPress}>
              {isVideoUrl(url) ? (
                <View style={[styles.mediaThumb, styles.videoThumb, { backgroundColor: `${MARKETPLACE_ACCENT}22` }]}>
                  <Ionicons name="play-circle" size={22} color={MARKETPLACE_ACCENT} />
                </View>
              ) : (
                <Image source={{ uri: url }} style={styles.mediaThumb} />
              )}
            </Pressable>
          ))}
        </View>
      ) : null}

      <MarketplaceCommentMediaViewer
        visible={viewerOpen}
        mediaUrls={comment.mediaUrls}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  author: { fontWeight: '700' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  body: { lineHeight: 18 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  mediaPress: { borderRadius: radius.md, overflow: 'hidden' },
  mediaThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.md,
    backgroundColor: '#111',
  },
  videoThumb: { alignItems: 'center', justifyContent: 'center' },
});
