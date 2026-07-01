import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Text } from '@/components/ui/Text';
import { parseStoryReplyMetadata } from '@/features/messaging/services/storyReplyMetadata';
import { resolveStoryThumbUrl } from '@/features/stories/services/storyMediaUrl';
import { radius, spacing } from '@/constants/theme';
import type { ChatMessage } from '../types';

const STORY_REPLY_ASPECT = 9 / 16;

type ChatStoryReplyCardProps = {
  message: ChatMessage;
  isMine: boolean;
  textColor: string;
  metaColor: string;
  bubbleBackground: string;
};

export function ChatStoryReplyCard({
  message,
  isMine,
  textColor,
  metaColor,
  bubbleBackground,
}: ChatStoryReplyCardProps) {
  const meta = parseStoryReplyMetadata(message.metadata);
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(220, screenWidth * 0.58);
  const mediaHeight = cardWidth / STORY_REPLY_ASPECT;

  if (!meta) return null;

  const thumbUrl = resolveStoryThumbUrl(meta.storyThumbUrl, meta.storyMediaUrl);
  const authorLabel = meta.storyAuthorUsername ? `@${meta.storyAuthorUsername}` : 'Hikâye';

  return (
    <View style={[styles.wrap, { backgroundColor: bubbleBackground, maxWidth: cardWidth + spacing.md }]}>
      <View style={styles.header}>
        <LinearGradient colors={['#f09433', '#dc2743', '#bc1888']} style={styles.storyPill}>
          <Text variant="caption" style={styles.storyPillText}>
            Hikâye yanıtı
          </Text>
        </LinearGradient>
        <Text variant="caption" style={{ color: metaColor }} numberOfLines={1}>
          {authorLabel}
        </Text>
      </View>

      <View style={[styles.mediaFrame, { width: cardWidth, height: mediaHeight }]}>
        {thumbUrl ? (
          <OptimizedImage uri={thumbUrl} tier="feed" style={styles.thumb} contentFit="cover" recyclingKey={meta.storyItemId} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="images-outline" size={32} color="rgba(255,255,255,0.45)" />
          </View>
        )}
        {meta.storyMediaType === 'video' ? (
          <View style={styles.playBadge}>
            <Ionicons name="play" size={16} color="#fff" />
          </View>
        ) : null}
      </View>

      {message.content.trim() ? (
        <Text variant="body" style={{ color: textColor, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm }}>
          {message.content.trim()}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  storyPill: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  storyPillText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
  },
  mediaFrame: {
    alignSelf: 'center',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  playBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
});
