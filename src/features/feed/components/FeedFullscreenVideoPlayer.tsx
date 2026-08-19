import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { usePublishedMusicPlayer } from '@/features/music/hooks/usePublishedMusicPlayer';
import type { MusicSelection } from '@/features/music/types';
import { ensureReelFeedAudioMode } from '@/features/music/services/audioPreview';
import {
  readVideoPlayerPlaying,
  readVideoPlayerStatus,
  runIfVideoPlayerAlive,
} from '@/features/reels/services/safeVideoPlayer';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { isPlayableVideoUrl, toVideoSource } from '@/lib/media/videoSource';

type FeedFullscreenVideoPlayerProps = {
  uri: string;
  posterUri?: string | null;
  music?: MusicSelection | null;
  style?: StyleProp<ViewStyle>;
};

/**
 * Feed tam ekran — SyncedVideoPreview'daki replaceAsync / sessiz varsayılan yok.
 * Kaynak bir kez bağlanır, poster üstte kalır, play hemen denenir.
 */
export const FeedFullscreenVideoPlayer = memo(function FeedFullscreenVideoPlayer({
  uri,
  posterUri,
  music = null,
  style,
}: FeedFullscreenVideoPlayerProps) {
  const [showPoster, setShowPoster] = useState(true);
  const [layoutReady, setLayoutReady] = useState(false);
  const normalizedUri = useMemo(() => normalizeLocalFileUri(uri), [uri]);
  const source = useMemo(() => toVideoSource(normalizedUri), [normalizedUri]);
  const playable = Boolean(source) && isPlayableVideoUrl(normalizedUri);

  const hasMusic = Boolean(music?.audioUrl);
  const muteOriginal =
    hasMusic && (music?.originalAudioVolume ?? 0) <= 0.001;
  const originalVolume = hasMusic
    ? Math.max(0, music?.originalAudioVolume ?? 0)
    : 1;

  const player = useVideoPlayer(playable ? source : null, (p) => {
    p.loop = true;
    p.muted = muteOriginal;
    p.volume = muteOriginal ? 0 : originalVolume;
  });

  usePublishedMusicPlayer({
    videoPlayer: player,
    config: hasMusic
      ? {
          audioUrl: music!.audioUrl,
          musicStartSec: music!.musicStartSec,
          musicEndSec: music!.musicEndSec,
          musicVolume: music!.musicVolume,
          originalAudioVolume: music!.originalAudioVolume,
        }
      : null,
    active: hasMusic && layoutReady,
  });

  const hidePoster = useCallback(() => setShowPoster(false), []);

  useEffect(() => {
    setShowPoster(true);
    setLayoutReady(false);
  }, [normalizedUri]);

  useEffect(() => {
    void ensureReelFeedAudioMode();
  }, []);

  useEffect(() => {
    if (!playable || !layoutReady) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const tryPlay = () => {
      if (cancelled) return;
      runIfVideoPlayerAlive(player, (p) => {
        p.muted = muteOriginal;
        p.volume = muteOriginal ? 0 : originalVolume;
        p.play();
      });
    };

    void ensureReelFeedAudioMode().finally(() => {
      if (!cancelled) tryPlay();
    });

    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        tryPlay();
        if (readVideoPlayerPlaying(player) === true) hidePoster();
      }
      if (status === 'error') {
        // Codec / yüzey yarışı — kısa gecikmeyle yeniden dene
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(tryPlay, 180);
      }
    });

    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) hidePoster();
    });

    if (
      readVideoPlayerStatus(player) === 'readyToPlay' &&
      readVideoPlayerPlaying(player) === true
    ) {
      hidePoster();
    }

    const fallback = setTimeout(() => {
      tryPlay();
      if (
        readVideoPlayerPlaying(player) === true ||
        readVideoPlayerStatus(player) === 'readyToPlay'
      ) {
        hidePoster();
      }
    }, 400);

    const lateRetry = setTimeout(tryPlay, 700);

    return () => {
      cancelled = true;
      statusSub.remove();
      playingSub.remove();
      clearTimeout(fallback);
      clearTimeout(lateRetry);
      if (retryTimer) clearTimeout(retryTimer);
      runIfVideoPlayerAlive(player, (p) => {
        p.pause();
      });
    };
  }, [playable, layoutReady, player, muteOriginal, originalVolume, hidePoster]);

  const poster = posterUri ? normalizeLocalFileUri(posterUri) : null;
  const localPoster =
    poster && (poster.startsWith('file://') || poster.startsWith('content://'));

  return (
    <View
      style={[styles.root, style]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) setLayoutReady(true);
      }}
    >
      {poster && showPoster ? (
        localPoster ? (
          <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <OptimizedImage
            uri={poster}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            tier="thumb"
            recyclingKey={`fs-fast-poster-${poster}`}
          />
        )
      ) : null}
      {playable ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
});
