import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { resolveChatVideoPlaybackUri } from '../services/resolveChatVideoPlayback';
import { ChatVideoPlayer } from './ChatVideoPlayer';
import { toUserFacingError } from '@/lib/errors';

type ChatMediaViewerProps = {
  uri: string;
  isVideo: boolean;
  onClose: () => void;
  ephemeralDurationSec?: number;
  onEphemeralExpired?: () => void;
};

/** Sohbet medyası — tam ekran görüntü veya video oynatıcı. */
export function ChatMediaViewer({
  uri,
  isVideo,
  onClose,
  ephemeralDurationSec,
  onEphemeralExpired,
}: ChatMediaViewerProps) {
  const insets = useSafeAreaInsets();
  const [playbackUri, setPlaybackUri] = useState<string | null>(isVideo ? null : uri);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [remainingSec, setRemainingSec] = useState(ephemeralDurationSec ?? 0);

  useEffect(() => {
    if (!isVideo) {
      setPlaybackUri(uri);
      setPrepareError(null);
      return;
    }

    let cancelled = false;
    setPlaybackUri(null);
    setPrepareError(null);

    void resolveChatVideoPlaybackUri(uri)
      .then((localUri) => {
        if (!cancelled) setPlaybackUri(localUri);
      })
      .catch((err) => {
        if (!cancelled) {
          setPrepareError(toUserFacingError(err instanceof Error ? err.message : null, {
            fallback: 'Video hazırlanamadı',
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isVideo, uri]);

  useEffect(() => {
    if (!ephemeralDurationSec || ephemeralDurationSec <= 0) return;
    setRemainingSec(ephemeralDurationSec);
    const startedAt = Date.now();
    const intervalId = setInterval(() => {
      const left = ephemeralDurationSec - Math.floor((Date.now() - startedAt) / 1000);
      if (left <= 0) {
        clearInterval(intervalId);
        setRemainingSec(0);
        onEphemeralExpired?.();
        onClose();
        return;
      }
      setRemainingSec(left);
    }, 250);
    return () => clearInterval(intervalId);
  }, [ephemeralDurationSec, onClose, onEphemeralExpired, uri]);

  const showVideo = isVideo && !prepareError && Boolean(playbackUri);

  return (
    <Modal
      visible
      animationType={resolveModalAnimationType('fade')}
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={[styles.stage, { paddingBottom: insets.bottom }]} collapsable={false}>
          {isVideo ? (
            prepareError ? (
              <Pressable style={styles.prepareError} onPress={onClose} accessibilityLabel="Kapat">
                <Ionicons name="alert-circle-outline" size={40} color="#fff" />
                <Text variant="caption" style={styles.prepareErrorText}>
                  {prepareError}
                </Text>
              </Pressable>
            ) : playbackUri ? (
              <ChatVideoPlayer key={playbackUri} uri={playbackUri} autoPlay />
            ) : (
              <Pressable style={styles.prepareError} onPress={onClose} accessibilityLabel="Kapat">
                <ActivityIndicator color="#fff" size="large" />
                <Text variant="caption" style={styles.prepareErrorText}>
                  Video hazırlanıyor…
                </Text>
              </Pressable>
            )
          ) : (
            <Pressable
              style={styles.imageStage}
              onPress={ephemeralDurationSec ? undefined : onClose}
              accessibilityLabel={ephemeralDurationSec ? undefined : 'Kapat'}
            >
              <Image source={{ uri }} style={styles.media} contentFit="contain" />
            </Pressable>
          )}
        </View>

        {showVideo ? (
          <Pressable
            style={[styles.dismissZoneTop, { height: insets.top + 56 }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
          />
        ) : null}

        <Pressable
          style={[
            styles.closeBtn,
            {
              top: insets.top + spacing.sm,
              right: spacing.md + insets.right,
            },
          ]}
          onPress={onClose}
          hitSlop={20}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        >
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>

        {ephemeralDurationSec && ephemeralDurationSec > 0 ? (
          <View style={[styles.ephemeralTimer, { top: insets.top + spacing.sm }]}>
            <Ionicons name="timer-outline" size={14} color="#fff" />
            <Text variant="caption" style={styles.ephemeralTimerText}>
              {remainingSec}s
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  stage: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  prepareError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  prepareErrorText: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '600',
  },
  dismissZoneTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 88,
    zIndex: 10,
  },
  closeBtn: {
    position: 'absolute',
    zIndex: 30,
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  ephemeralTimer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  ephemeralTimerText: {
    color: '#fff',
    fontWeight: '700',
  },
});
