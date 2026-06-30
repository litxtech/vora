import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius } from '@/constants/theme';
import { CHAT_MEDIA_ASPECT, CHAT_MEDIA_MAX_HEIGHT, CHAT_MEDIA_WIDTH } from '../constants';
import {
  getEphemeralRemainingSec,
  getEphemeralViewedAtMs,
  isEphemeralImageExpired,
  markEphemeralImageViewed,
  parseEphemeralImageMetadata,
  resolveEphemeralExpiryAtMs,
  shouldBlurEphemeralImage,
} from '../services/ephemeralImage';
import type { ChatMessage } from '../types';
import { ChatEphemeralExpiredNotice } from './ChatEphemeralExpiredNotice';
import { ChatMediaViewer } from './ChatMediaViewer';

type ChatEphemeralMediaProps = {
  message: ChatMessage;
  viewerId: string | null | undefined;
  isMine?: boolean;
  viewedAtMs?: number | null;
  onViewed?: (messageId: string, viewedAtMs: number) => void;
  onMessageExpired?: (messageId: string) => void;
};

export function ChatEphemeralMedia({
  message,
  viewerId,
  isMine = false,
  viewedAtMs: viewedAtMsProp,
  onViewed,
  onMessageExpired,
}: ChatEphemeralMediaProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewedLocally, setViewedLocally] = useState(false);
  const [tick, setTick] = useState(0);

  const meta = useMemo(() => parseEphemeralImageMetadata(message.metadata), [message.metadata]);
  const expired = isEphemeralImageExpired(message);
  const isVideo = message.messageType === 'video';
  const isRecipient = Boolean(viewerId && message.senderId !== viewerId);
  const remoteViewedAtMs = getEphemeralViewedAtMs(message.metadata);
  const effectiveViewedAtMs = viewedAtMsProp ?? remoteViewedAtMs ?? (viewedLocally ? Date.now() : null);
  const blurred = !viewedLocally && !remoteViewedAtMs && shouldBlurEphemeralImage(message, viewerId);
  const uri = message.localMediaUri ?? message.mediaUrl;
  const remainingSec = getEphemeralRemainingSec(message.metadata, effectiveViewedAtMs);
  const expiryAtMs = resolveEphemeralExpiryAtMs(message, viewerId, effectiveViewedAtMs);

  useEffect(() => {
    if (!expiryAtMs || expired) return;
    const intervalId = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(intervalId);
  }, [expiryAtMs, expired]);

  const handleOpen = async () => {
    if (!uri || expired || !isRecipient) return;

    const startedAt = Date.now();
    if (message.id && !message.localOnly) {
      await markEphemeralImageViewed(message.id);
    }
    setViewedLocally(true);
    onViewed?.(message.id, startedAt);
    setViewerOpen(true);
  };

  if (expired) {
    return <ChatEphemeralExpiredNotice isMine={isMine} />;
  }

  if (!uri || !meta) return null;

  const senderWaitingForView = !isRecipient && !effectiveViewedAtMs;
  const countdownLabel = senderWaitingForView
    ? 'Açılmadı'
    : remainingSec != null
      ? `${remainingSec}s`
      : isRecipient
        ? `${meta.durationSec}s`
        : expiryAtMs
          ? `${Math.max(0, Math.ceil((expiryAtMs - Date.now()) / 1000))}s`
          : `${meta.durationSec}s`;

  return (
    <>
      <Pressable onPress={() => void handleOpen()} style={styles.wrap} disabled={!isRecipient}>
        {isVideo ? (
          <View style={[styles.media, styles.videoPlaceholder]}>
            <Ionicons name="videocam" size={34} color="rgba(255,255,255,0.85)" />
            <Text variant="caption" style={styles.videoPlaceholderText}>
              Süreli video
            </Text>
          </View>
        ) : (
          <Image source={{ uri }} style={styles.media} contentFit="cover" />
        )}
        {blurred ? (
          <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={styles.blurContent}>
              <Ionicons name={isVideo ? 'videocam-outline' : 'timer-outline'} size={28} color="#fff" />
              <Text variant="caption" style={styles.blurText}>
                {isVideo ? 'Süreli video' : 'Süreli fotoğraf'}
              </Text>
              <Text variant="caption" style={styles.blurHint}>
                Görmek için dokun
              </Text>
            </View>
          </BlurView>
        ) : (
          <>
            {isVideo && isRecipient ? (
              <View style={styles.playBadge}>
                <Ionicons name="play" size={26} color="#fff" />
              </View>
            ) : null}
          <View style={styles.badge}>
            <Ionicons
              name={senderWaitingForView ? 'eye-off-outline' : 'timer-outline'}
              size={12}
              color="#fff"
            />
            <Text variant="caption" style={styles.badgeText}>
              {countdownLabel}
            </Text>
          </View>
          </>
        )}
      </Pressable>

      {viewerOpen ? (
        <ChatMediaViewer
          uri={uri}
          isVideo={isVideo}
          ephemeralDurationSec={isRecipient ? meta.durationSec : undefined}
          onEphemeralExpired={() => onMessageExpired?.(message.id)}
          onClose={() => setViewerOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 2,
  },
  media: {
    width: CHAT_MEDIA_WIDTH,
    maxWidth: '100%',
    aspectRatio: CHAT_MEDIA_ASPECT,
    maxHeight: CHAT_MEDIA_MAX_HEIGHT,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,16,22,0.92)',
  },
  videoPlaceholderText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  playBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  blurText: {
    color: '#fff',
    fontWeight: '700',
  },
  blurHint: {
    color: 'rgba(255,255,255,0.8)',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
});
