import { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { MusicSelection } from '@/features/music/types';
import { usePublishedMusicPlayer } from '@/features/music/hooks/usePublishedMusicPlayer';
import { PublishedStudioOverlays } from '@/features/vora-studio/components/PublishedStudioOverlays';
import type { PublishedEditManifest } from '@/features/vora-studio/types';

type SyncedVideoPreviewProps = {
  uri: string;
  music?: MusicSelection | null;
  editManifest?: PublishedEditManifest | null;
  style?: object;
  autoPlay?: boolean;
};

export function SyncedVideoPreview({
  uri,
  music,
  editManifest,
  style,
  autoPlay = true,
}: SyncedVideoPreviewProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [playheadSec, setPlayheadSec] = useState(0);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = music ? music.originalAudioVolume <= 0.001 : true;
    p.volume = music && music.originalAudioVolume > 0.001 ? music.originalAudioVolume : 0;
    p.timeUpdateEventInterval = 0.25;
    if (autoPlay) p.play();
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
    if (!music) return;
    const muteOriginal = music.originalAudioVolume <= 0.001;
    player.muted = muteOriginal || Boolean(music.audioUrl);
    player.volume = muteOriginal ? 0 : music.originalAudioVolume;
  }, [music, player]);

  useEffect(() => {
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      setPlayheadSec(currentTime);
    });
    return () => sub.remove();
  }, [player]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  return (
    <View style={[styles.wrap, style]} onLayout={onLayout}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
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
    overflow: 'hidden',
    backgroundColor: '#000',
  },
});
