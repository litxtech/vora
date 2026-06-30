import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { radius } from '@/constants/theme';
import { getMuxThumbnailUrl } from '@/lib/mux/client';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { isProcessingVideoUrl } from '@/lib/media/videoProcessingUrl';
import { CHAT_MEDIA_ASPECT, CHAT_MEDIA_MAX_HEIGHT, CHAT_MEDIA_WIDTH } from '../constants';
import { useChatMediaViewer } from '../context/ChatMediaViewerContext';
import { useDoubleTap } from '../hooks/useDoubleTap';
import { useLocalVideoThumbnail } from '../hooks/useLocalVideoThumbnail';
import type { MediaUploadStage } from '../types';
import { ChatVideoPreviewFrame } from './ChatVideoPreviewFrame';
import { ChatVideoUploadOverlay } from './ChatVideoUploadOverlay';

function isLocalMediaUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://');
}

function getMuxThumbnail(url: string): string | null {
  const muxMatch = url.match(/stream\.mux\.com\/([^./?]+)/);
  if (muxMatch?.[1]) return getMuxThumbnailUrl(muxMatch[1]);
  return null;
}

function resolvePlaybackUri(remoteUri: string, localUri?: string | null): string {
  if (isLocalMediaUri(remoteUri)) return remoteUri;
  if (/^https?:\/\//i.test(remoteUri) && isVideoUrl(remoteUri) && !remoteUri.includes('.m3u8')) {
    return remoteUri;
  }
  if (localUri && isLocalMediaUri(localUri)) return localUri;
  return remoteUri;
}

type ChatVideoAttachmentProps = {
  uri: string;
  localMediaUri?: string | null;
  uploadStage?: MediaUploadStage;
  uploadProgress?: number;
  uploadEtaSec?: number;
  isUploading?: boolean;
  isQueued?: boolean;
  onLongPress?: () => void;
  onDoublePress?: () => void;
};

/** Sohbet video önizlemesi — dokununca tam ekran oynatıcı açılır. */
export function ChatVideoAttachment({
  uri,
  localMediaUri,
  uploadStage,
  uploadProgress,
  uploadEtaSec,
  isUploading,
  isQueued,
  onLongPress,
  onDoublePress,
}: ChatVideoAttachmentProps) {
  const { openMedia } = useChatMediaViewer();
  const previewUri = localMediaUri ?? uri;
  const playbackUri = resolvePlaybackUri(uri, localMediaUri);
  const isProcessing = isProcessingVideoUrl(uri);
  const thumbnailUri = !isProcessing && (isLocalMediaUri(previewUri) || isVideoUrl(previewUri)) ? previewUri : null;
  const generatedThumb = useLocalVideoThumbnail(getMuxThumbnail(uri) ? null : thumbnailUri);
  const thumbnailUrl = !isProcessing ? getMuxThumbnail(uri) ?? generatedThumb : null;
  const showVideoFrame = !thumbnailUrl && !isProcessing;
  const showUploadOverlay = Boolean(isUploading && uploadStage);
  const canOpen = !showUploadOverlay && !isProcessing && Boolean(playbackUri);

  const openVideo = () => {
    if (!canOpen) return;
    openMedia(playbackUri, { isVideo: true });
  };

  const handlePress = useDoubleTap({
    onSingleTap: canOpen ? openVideo : undefined,
    onDoubleTap: onDoublePress,
  });

  if (isProcessing) {
    return (
      <View style={[styles.media, styles.processing]}>
        <ActivityIndicator color="#fff" size="small" />
        <Text variant="caption" style={styles.processingText}>
          Video işleniyor...
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={280}
      disabled={!canOpen}
      style={({ pressed }) => [styles.media, pressed && canOpen && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={showUploadOverlay ? "Video Vora'ya yükleniyor" : 'Videoyu oynat'}
    >
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          pointerEvents="none"
        />
      ) : showVideoFrame ? (
        <ChatVideoPreviewFrame />
      ) : (
        <View style={styles.fallbackBg} pointerEvents="none" />
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {!showUploadOverlay ? (
        <View style={styles.playWrap} pointerEvents="none">
          <View style={styles.playRing}>
            <Ionicons name="play" size={22} color="#fff" style={styles.playIcon} />
          </View>
        </View>
      ) : null}

      <View style={styles.badge} pointerEvents="none">
        <Ionicons name="videocam" size={11} color="#fff" />
        <Text variant="caption" style={styles.badgeText}>
          Video
        </Text>
      </View>

      {showUploadOverlay ? (
        <ChatVideoUploadOverlay stage={uploadStage} progress={uploadProgress} etaSec={uploadEtaSec} />
      ) : null}

      {isQueued && !showUploadOverlay ? (
        <View style={styles.queueOverlay} pointerEvents="none">
          <Ionicons name="cloud-offline-outline" size={22} color="#fff" />
          <Text variant="caption" style={styles.queueText}>
            Bağlantı gelince gönderilecek
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  media: {
    width: CHAT_MEDIA_WIDTH,
    maxWidth: '100%',
    aspectRatio: CHAT_MEDIA_ASPECT,
    maxHeight: CHAT_MEDIA_MAX_HEIGHT,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 2,
    backgroundColor: '#0A0E14',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  processing: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  processingText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    fontSize: 11,
  },
  fallbackBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#121820',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
  },
  playWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  playIcon: {
    marginLeft: 3,
  },
  badge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 10,
  },
  queueOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  queueText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
