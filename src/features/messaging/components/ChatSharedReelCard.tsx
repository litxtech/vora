import { Alert, Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { getMuxThumbnailUrl, extractMuxPlaybackId } from '@/lib/mux/client';
import { CHAT_REEL_SHARE_ASPECT, CHAT_REEL_SHARE_WIDTH } from '../constants';
import { openReelsAtReel } from '@/features/reels/services/reelsNavigation';
import { useSharedReelAvailability } from '../hooks/useSharedReelAvailability';
import { resolveReelShareHints } from '../services/reelShareHints';
import { fetchSharedReelAvailability } from '../services/sharedReelAvailability';
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

function showRemovedReelAlert() {
  Alert.alert('Bu reel kaldırıldı', 'Paylaşılan reel artık mevcut değil.');
}

export function ChatSharedReelCard({ message, textColor, metaColor }: ChatSharedReelCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(CHAT_REEL_SHARE_WIDTH, screenWidth * 0.72);
  const cardHeight = cardWidth / CHAT_REEL_SHARE_ASPECT;
  const thumbnailUrl = resolveThumbnailUrl(message);
  const targetId = message.metadata?.targetId;
  const { isRemoved } = useSharedReelAvailability(targetId);

  const openReel = async () => {
    if (!targetId) return;
    if (isRemoved) {
      showRemovedReelAlert();
      return;
    }

    const available = await fetchSharedReelAvailability(targetId);
    if (!available) {
      showRemovedReelAlert();
      return;
    }

    openReelsAtReel(targetId, resolveReelShareHints(targetId, message.metadata));
  };

  return (
    <Pressable
      style={[styles.wrap, { width: cardWidth }]}
      onPress={() => void openReel()}
      accessibilityRole="button"
      accessibilityLabel={isRemoved ? 'Kaldırılmış reel' : 'Paylaşılan reel'}
    >
      <View style={[styles.mediaFrame, { width: cardWidth, height: cardHeight }]}>
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={[styles.thumb, isRemoved ? styles.thumbRemoved : null]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbPlaceholder, isRemoved ? styles.thumbRemoved : null]}>
            <Ionicons name="film-outline" size={40} color="rgba(255,255,255,0.45)" />
          </View>
        )}
        {isRemoved ? (
          <>
            <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={styles.removedOverlay} pointerEvents="none">
              <Ionicons name="snow-outline" size={28} color="rgba(255,255,255,0.92)" />
              <Text variant="caption" style={styles.removedLabel}>
                Bu reel kaldırıldı
              </Text>
            </View>
          </>
        ) : (
          <>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.55)']}
              style={styles.mediaGradient}
              pointerEvents="none"
            />
            <View style={styles.playBadge} pointerEvents="none">
              <Ionicons name="play" size={22} color="#fff" />
            </View>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <ChatSharedAuthorRow
          metadata={message.metadata}
          textColor={textColor}
          metaColor={metaColor}
        />
        {isRemoved ? (
          <Text variant="caption" style={{ color: metaColor }} numberOfLines={1}>
            Bu reel kaldırıldı
          </Text>
        ) : message.metadata?.preview?.trim() ? (
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
  thumbRemoved: {
    opacity: 0.45,
  },
  removedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  removedLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '700',
    textAlign: 'center',
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
