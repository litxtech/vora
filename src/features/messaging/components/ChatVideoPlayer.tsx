import { memo, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { ensureVideoPlaybackAudioMode } from '@/lib/audio/safeAudioMode';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { isPlayableVideoUrl, toVideoSource } from '@/lib/media/videoSource';

type ChatVideoPlayerProps = {
  uri: string;
  autoPlay?: boolean;
  /** capture = çekim sonrası onay; viewer = gelen video oynatma */
  variant?: 'capture' | 'viewer';
};

/**
 * Sohbet video oynatıcı — Modal içinde pencere boyutlu VideoView.
 * Opacity / transform gizleme yok (siyah kare önlenir).
 */
export const ChatVideoPlayer = memo(function ChatVideoPlayer({
  uri,
  autoPlay = true,
  variant = 'viewer',
}: ChatVideoPlayerProps) {
  const { width, height } = useWindowDimensions();
  const normalizedUri = useMemo(() => normalizeLocalFileUri(uri), [uri]);
  const source = useMemo(() => toVideoSource(normalizedUri), [normalizedUri]);
  const playable = Boolean(source) && isPlayableVideoUrl(normalizedUri);

  const [ready, setReady] = useState(false);
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [showPoster, setShowPoster] = useState(true);

  // Modal açılır açılmaz VideoView mount etme — bir kare geciktir
  useEffect(() => {
    setReady(false);
    setShowPoster(true);
    setPosterUri(null);
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, [normalizedUri]);

  useEffect(() => {
    let cancelled = false;
    void ensureVideoPlaybackAudioMode();
    void (async () => {
      try {
        const thumb = await VideoThumbnails.getThumbnailAsync(normalizedUri, {
          time: 0,
          quality: 0.7,
        });
        if (!cancelled && thumb.uri) setPosterUri(thumb.uri);
      } catch {
        // poster opsiyonel
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [normalizedUri]);

  const player = useVideoPlayer(ready && playable ? source : null, (p) => {
    p.loop = variant === 'capture';
    p.muted = false;
    p.volume = 1;
  });

  useEffect(() => {
    if (!ready || !playable) return;
    let cancelled = false;
    void ensureVideoPlaybackAudioMode();

    const start = () => {
      if (cancelled || !autoPlay) return;
      try {
        player.play();
      } catch {
        // henüz hazır değil
      }
    };

    start();
    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') start();
    });
    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) setShowPoster(false);
    });
    const fallback = setTimeout(() => {
      if (!cancelled) setShowPoster(false);
    }, 1400);

    return () => {
      cancelled = true;
      statusSub.remove();
      playingSub.remove();
      clearTimeout(fallback);
      try {
        player.pause();
      } catch {
        // released
      }
    };
  }, [autoPlay, playable, player, ready, normalizedUri]);

  return (
    <View style={[styles.root, { width, height }]} collapsable={false}>
      {ready && playable ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit={variant === 'capture' ? 'contain' : 'contain'}
          nativeControls={variant === 'viewer'}
          allowsPictureInPicture={variant === 'viewer'}
          onFirstFrameRender={() => setShowPoster(false)}
          {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
        />
      ) : null}

      {showPoster ? (
        posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            pointerEvents="none"
          />
        ) : (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator color="#fff" size="large" />
          </View>
        )
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
});
