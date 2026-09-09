import { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { MusicSelection } from '@/features/music/types';
import { usePublishedMusicPlayer } from '@/features/music/hooks/usePublishedMusicPlayer';
import { PublishedStudioOverlays } from '@/features/vora-studio/components/PublishedStudioOverlays';
import type { PublishedEditManifest } from '@/features/vora-studio/types';
import { ensureVideoPlaybackAudioMode } from '@/lib/audio/safeAudioMode';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { isPlayableVideoUrl, toVideoSource } from '@/lib/media/videoSource';

type SyncedVideoPreviewProps = {
  uri: string;
  music?: MusicSelection | null;
  editManifest?: PublishedEditManifest | null;
  style?: object;
  autoPlay?: boolean;
  /** Videonun orijinal sesini kapat (müzikten bağımsız) */
  muted?: boolean;
  onPlayhead?: (sec: number) => void;
};

export function SyncedVideoPreview({
  uri,
  music,
  editManifest,
  style,
  autoPlay = true,
  muted = false,
  onPlayhead,
}: SyncedVideoPreviewProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [playheadSec, setPlayheadSec] = useState(0);

  const normalizedUri = useMemo(() => normalizeLocalFileUri(uri), [uri]);
  const source = useMemo(
    () => toVideoSource(normalizedUri) ?? normalizedUri,
    [normalizedUri],
  );
  const playable = Boolean(normalizedUri) && isPlayableVideoUrl(normalizedUri);

  const muteOriginal = muted || (music ? music.originalAudioVolume <= 0.001 : false);

  const player = useVideoPlayer(playable ? source : null, (p) => {
    p.loop = true;
    p.muted = muteOriginal;
    p.volume = muteOriginal
      ? 0
      : music && music.originalAudioVolume > 0.001
        ? music.originalAudioVolume
        : 1;
    p.timeUpdateEventInterval = 0.25;
  });

  const musicPlayback = music
    ? {
        audioUrl: music.audioUrl,
        musicStartSec: music.musicStartSec,
        musicEndSec: music.musicEndSec,
        musicVolume: music.musicVolume,
        originalAudioVolume: music.originalAudioVolume,
      }
    : null;

  usePublishedMusicPlayer({
    videoPlayer: player,
    config: musicPlayback,
    active: autoPlay && Boolean(musicPlayback),
  });

  useEffect(() => {
    void ensureVideoPlaybackAudioMode();
  }, []);

  useEffect(() => {
    if (!playable || !source) return;
    let cancelled = false;

    const start = () => {
      if (!autoPlay || cancelled) return;
      try {
        player.play();
      } catch {
        // player henüz hazır değil
      }
    };

    start();

    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') start();
    });

    return () => {
      cancelled = true;
      statusSub.remove();
      try {
        player.pause();
      } catch {
        // released
      }
    };
  }, [autoPlay, playable, player, source]);

  useEffect(() => {
    if (muted) {
      player.muted = true;
      player.volume = 0;
      return;
    }
    if (!music) {
      player.muted = false;
      player.volume = 1;
      return;
    }
    const mute = music.originalAudioVolume <= 0.001;
    player.muted = mute || Boolean(music.audioUrl);
    player.volume = mute ? 0 : music.originalAudioVolume;
  }, [muted, music, player]);

  useEffect(() => {
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      setPlayheadSec(currentTime);
      onPlayhead?.(currentTime);
    });
    return () => sub.remove();
  }, [onPlayhead, player]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  return (
    <View style={[styles.wrap, style]} onLayout={onLayout}>
      {playable ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
        />
      ) : null}
      <PublishedStudioOverlays
        editManifest={editManifest ?? null}
        playheadSec={playheadSec}
        containerWidth={layout.width}
        containerHeight={layout.height}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
});
