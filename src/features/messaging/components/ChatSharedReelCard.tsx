import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { getMuxThumbnailUrl, extractMuxPlaybackId } from '@/lib/mux/client';
import { CHAT_REEL_SHARE_ASPECT, CHAT_REEL_SHARE_WIDTH } from '../constants';
import { openReelsAtReel } from '@/features/reels/services/reelsNavigation';
import { resolveReelShareHints } from '../services/reelShareHints';
import { ChatSharedAuthorRow } from './ChatSharedAuthorRow';
import type { ChatMessage } from '../types';

type ChatSharedReelCardProps = {
  message: ChatMessage;
  textColor: string;
  metaColor: string;
};

function resolveThumbnailUrl(message: ChatMessage): string | null {
  const meta = message.metadata;
  if (!meta) return null;

  if (meta.imageUrl) return meta.imageUrl;

  const playbackId =
    (meta.mediaUrl ? extractMuxPlaybackId(meta.mediaUrl) : null) ??
    (meta.imageUrl ? extractMuxPlaybackId(meta.imageUrl) : null);
  if (playbackId) return getMuxThumbnailUrl(playbackId);

  return null;
}

export function ChatSharedReelCard({ message, textColor, metaColor }: ChatSharedReelCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(CHAT_REEL_SHARE_WIDTH, screenWidth * 0.72);
  const cardHeight = cardWidth / CHAT_REEL_SHARE_ASPECT;
  const thumbnailUrl = resolveThumbnailUrl(message);
  const targetId = message.metadata?.targetId;

  const openReel = () => {
    if (!targetId) return;
    openReelsAtReel(targetId, resolveReelShareHints(targetId, message.metadata));
  };

  return (
    <Pressable
      style={[styles.wrap, { width: cardWidth }]}
      onPress={openReel}
      accessibilityRole="button"
      accessibilityLabel="Paylaşılan reel"
    >
      <View style={[styles.mediaFrame, { width: cardWidth, height: cardHeight }]}>
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="film-outline" size={40} color="rgba(255,255,255,0.45)" />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          style={styles.mediaGradient}
          pointerEvents="none"
        />
        <View style={styles.playBadge} pointerEvents="none">
          <Ionicons name="play" size={22} color="#fff" />
        </View>
      </View>

      <View style={styles.footer}>
        <ChatSharedAuthorRow
          metadata={message.metadata}
          textColor={textColor}
          metaColor={metaColor}
        />
        {message.metadata?.preview?.trim() ? (
          <Text variant="caption" style={{ color: metaColor }} numberOfLines={2}>
            {message.metadata.preview.trim()}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  mediaFrame: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#0A0A0A',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111820',
  },
  mediaGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '38%',
  },
  playBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  footer: {
    gap: 2,
    paddingHorizontal: 2,
  },
});
