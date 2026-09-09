import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import type { ImageSizeTier } from '@/lib/device/androidPerfProfile';
import { isProcessingVideoUrl, parseProcessingVideoId } from '@/lib/media/videoProcessingUrl';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { resolveVideoThumbnailUrl } from '@/lib/media/videoThumbnailUrl';
import { VideoProcessingOverlay } from '@/components/media/VideoProcessingOverlay';
import { useLocalVideoPreviewStore } from '@/features/feed/store/localVideoPreviewStore';
import { warmLocalVideoPoster } from '@/features/feed/services/warmLocalVideoPoster';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';

type FeedMediaPreviewProps = {
  url: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain';
  onPress?: () => void;
  tier?: ImageSizeTier;
  layoutWidth?: number;
  showPlayIcon?: boolean;
};

function LocalPosterImage({
  uri,
  style,
}: {
  uri: string;
  style?: StyleProp<ImageStyle>;
}) {
  const normalized = normalizeLocalFileUri(uri);
  // Yerel file:// kapakları expo-image CDN yolundan geçmesin — Image daha güvenilir.
  if (normalized.startsWith('file://') || normalized.startsWith('content://')) {
    return <Image source={{ uri: normalized }} style={style} resizeMode="cover" />;
  }
  return (
    <OptimizedImage
      uri={normalized}
      style={style}
      contentFit="cover"
      tier="thumb"
      recyclingKey={normalized}
    />
  );
}

export function FeedMediaPreview({
  url,
  style,
  resizeMode = 'cover',
  onPress,
  showPlayIcon = true,
  tier = 'feed',
  layoutWidth,
}: FeedMediaPreviewProps) {
  const videoId = parseProcessingVideoId(url);
  const previewEntry = useLocalVideoPreviewStore((s) =>
    videoId ? s.byVideoId[videoId] ?? null : null,
  );
  const localPreview = previewEntry?.uri ? normalizeLocalFileUri(previewEntry.uri) : null;
  const localPoster = previewEntry?.posterUri
    ? normalizeLocalFileUri(previewEntry.posterUri)
    : null;
  const isProcessing = isProcessingVideoUrl(url);
  const isVideo = isVideoUrl(url) || Boolean(localPreview);

  useEffect(() => {
    if (!isProcessing || !videoId || !localPreview || localPoster) return;
    warmLocalVideoPoster(videoId, localPreview);
  }, [isProcessing, videoId, localPreview, localPoster]);

  const remotePoster =
    isVideo && !isProcessing ? resolveVideoThumbnailUrl(url) : null;
  const thumbnailUrl = localPoster ?? remotePoster;

  let content;
  if (isProcessing && !localPreview) {
    content = <VideoProcessingOverlay style={style} />;
  } else if (isVideo) {
    content = (
      <View style={[styles.videoWrap, style]}>
        {thumbnailUrl ? (
          <LocalPosterImage uri={thumbnailUrl} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.videoBackdrop}>
            <Ionicons name="videocam" size={28} color="rgba(255,255,255,0.45)" />
          </View>
        )}
        {showPlayIcon ? (
          <View style={styles.playOverlay}>
            <View style={styles.playBtn}>
              <Ionicons name="play" size={22} color="#fff" style={styles.playIcon} />
            </View>
          </View>
        ) : null}
      </View>
    );
  } else {
    content = (
      <OptimizedImage
        uri={url}
        style={style}
        contentFit={resizeMode}
        tier={tier}
        layoutWidth={layoutWidth}
        recyclingKey={url}
      />
    );
  }

  if (onPress && !(isProcessing && !localPreview)) {
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
  },
  videoBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,20,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  playIcon: {
    marginLeft: 2,
  },
});
