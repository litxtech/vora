import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { ensureVideoPlaybackAudioMode } from '@/lib/audio/safeAudioMode';
import { toVideoSource, isPlayableVideoUrl } from '@/lib/media/videoSource';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { usePublishedMusicPlayer } from '@/features/music/hooks/usePublishedMusicPlayer';
import type { MusicSelection } from '@/features/music/types';

type Props = {
  uri: string;
  autoPlay?: boolean;
  loop?: boolean;
  contentFit?: 'cover' | 'contain' | 'fill';
  nativeControls?: boolean;
  allowsPictureInPicture?: boolean;
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
  onPlayhead?: (sec: number) => void;
  music?: MusicSelection | null;
  videoMuted?: boolean;
};

/**
 * Kamera / galeri / sohbet video önizlemesi.
 * VideoView opacity veya transform ile gizlenmez (siyah kare önlenir).
 */
export function CapturedVideoPreview({
  uri,
  autoPlay = true,
  loop = true,
  contentFit = 'cover',
  nativeControls = false,
  allowsPictureInPicture = false,
  muted = false,
  style,
  onPlayhead,
  music = null,
  videoMuted = false,
}: Props) {
  const normalizedUri = useMemo(() => normalizeLocalFileUri(uri), [uri]);
  const playable = Boolean(normalizedUri) && isPlayableVideoUrl(normalizedUri);
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [showPoster, setShowPoster] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setPosterUri(null);
    setShowPoster(true);
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

  return (
    <View style={[styles.root, style]} collapsable={false}>
      {playable ? (
        <CapturedVideoPlayer
          key={normalizedUri}
          uri={normalizedUri}
          autoPlay={autoPlay}
          loop={loop}
          contentFit={contentFit}
          nativeControls={nativeControls}
          allowsPictureInPicture={allowsPictureInPicture}
          muted={muted}
          music={music}
          videoMuted={videoMuted}
          onPlayhead={onPlayhead}
          onFirstFrame={() => setShowPoster(false)}
        />
      ) : null}

      {showPoster ? (
        posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            pointerEvents="none"
          />
        ) : (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator color="#fff" />
          </View>
        )
      ) : null}
    </View>
  );
}

function CapturedVideoPlayer({
  uri,
  autoPlay,
  loop,
  contentFit,
  nativeControls,
  allowsPictureInPicture,
  muted,
  music,
  videoMuted,
  onPlayhead,
  onFirstFrame,
}: {
  uri: string;
  autoPlay: boolean;
  loop: boolean;
  contentFit: 'cover' | 'contain' | 'fill';
  nativeControls: boolean;
  allowsPictureInPicture: boolean;
  muted: boolean;
  music: MusicSelection | null;
  videoMuted: boolean;
  onPlayhead?: (sec: number) => void;
  onFirstFrame: () => void;
}) {
  const source = useMemo(() => toVideoSource(uri) ?? { uri }, [uri]);
  const muteOriginal = muted || videoMuted || (music ? music.originalAudioVolume <= 0.001 : false);

  const player = useVideoPlayer(source, (p) => {
    p.loop = loop;
    p.muted = muteOriginal;
    p.volume = muteOriginal
      ? 0
      : music && music.originalAudioVolume > 0.001
        ? music.originalAudioVolume
        : 1;
    if (onPlayhead) {
      p.timeUpdateEventInterval = 0.25;
    }
  });

  usePublishedMusicPlayer({
    videoPlayer: player,
    config: music
      ? {
          audioUrl: music.audioUrl,
          musicStartSec: music.musicStartSec,
          musicEndSec: music.musicEndSec,
          musicVolume: music.musicVolume,
          originalAudioVolume: music.originalAudioVolume,
        }
      : null,
    active: Boolean(music),
  });

  useEffect(() => {
    if (!onPlayhead) return;
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      onPlayhead(currentTime);
    });
    return () => sub.remove();
  }, [onPlayhead, player]);

  useEffect(() => {
    try {
      player.muted = muteOriginal;
      player.volume = muteOriginal
        ? 0
        : music && music.originalAudioVolume > 0.001
          ? music.originalAudioVolume
          : 1;
    } catch {
      // released
    }
  }, [muteOriginal, music, player]);

  useEffect(() => {
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

    const statusSub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'readyToPlay') start();
      if (__DEV__ && status === 'error') {
        console.warn('[CapturedVideoPreview] player error', uri, error);
      }
    });

    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) onFirstFrame();
    });

    const revealFallback = setTimeout(() => {
      if (!cancelled) onFirstFrame();
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(revealFallback);
      statusSub.remove();
      playingSub.remove();
      try {
        player.pause();
      } catch {
        // released
      }
    };
  }, [autoPlay, onFirstFrame, player, uri]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit={contentFit}
      nativeControls={nativeControls}
      allowsPictureInPicture={allowsPictureInPicture}
      onFirstFrameRender={onFirstFrame}
      {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
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
