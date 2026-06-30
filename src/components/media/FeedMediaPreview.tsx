import { Pressable, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import type { ImageSizeTier } from '@/lib/device/androidPerfProfile';
import { isProcessingVideoUrl } from '@/lib/media/videoProcessingUrl';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { resolveVideoThumbnailUrl } from '@/lib/media/videoThumbnailUrl';
import { VideoProcessingOverlay } from '@/components/media/VideoProcessingOverlay';

function getVideoThumbnailUrl(url: string): string | null {
  return resolveVideoThumbnailUrl(url);
}

type FeedMediaPreviewProps = {
  url: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain';
  onPress?: () => void;
  tier?: ImageSizeTier;
  layoutWidth?: number;
};

export function FeedMediaPreview({
  url,
  style,
  resizeMode = 'cover',
  onPress,
  showPlayIcon = true,
  tier = 'feed',
  layoutWidth,
}: FeedMediaPreviewProps & { showPlayIcon?: boolean }) {
  const isProcessing = isProcessingVideoUrl(url);
  const isVideo = isVideoUrl(url);

  const thumbnailUrl = isVideo && !isProcessing ? getVideoThumbnailUrl(url) : null;

  const content = isProcessing ? (
    <VideoProcessingOverlay style={style} />
  ) : isVideo ? (
    <View style={[styles.videoWrap, style]}>
      {thumbnailUrl ? (
        <OptimizedImage
          uri={thumbnailUrl}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          tier="thumb"
        />
      ) : (
        <View style={styles.videoBackdrop} />
      )}
      {showPlayIcon ? (
        <View style={styles.playOverlay}>
          <Ionicons name="play-circle" size={32} color="#fff" />
        </View>
      ) : null}
    </View>
  ) : (
    <OptimizedImage
      uri={url}
      style={style}
      contentFit={resizeMode}
      tier={tier}
      layoutWidth={layoutWidth}
      recyclingKey={url}
    />
  );

  if (onPress && !isProcessing) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
        {content}
      </Pressable>
    );
  }

  return content;
}

export function resolveSharedMediaUrl(metadata?: {
  mediaUrl?: string | null;
  imageUrl?: string | null;
} | null): string | null {
  if (!metadata) return null;
  return metadata.mediaUrl ?? metadata.imageUrl ?? null;
}

const styles = StyleSheet.create({
  videoWrap: {
    overflow: 'hidden',
    backgroundColor: '#0A0E14',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  videoBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,20,0.85)',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
