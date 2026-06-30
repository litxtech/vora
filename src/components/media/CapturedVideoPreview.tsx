import { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ensureVideoPlaybackAudioMode } from '@/lib/audio/safeAudioMode';
import { toVideoSource } from '@/lib/media/videoSource';
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
 * Kamera ile çekilen videoların önizlemesi — gönderi editörü ve sohbet onay ekranı ortak.
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
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: '#000',
        },
      }),
    [],
  );

  const source = useMemo(() => toVideoSource(uri) ?? uri, [uri]);
  const muteOriginal = muted || videoMuted || (music ? music.originalAudioVolume <= 0.001 : false);

  const player = useVideoPlayer(source, (p) => {
    p.loop = loop;
    p.muted = muteOriginal;
    p.volume = muteOriginal ? 0 : music && music.originalAudioVolume > 0.001 ? music.originalAudioVolume : 1;
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
    player.muted = muteOriginal;
    player.volume = muteOriginal ? 0 : music && music.originalAudioVolume > 0.001 ? music.originalAudioVolume : 1;
  }, [muteOriginal, music, player]);

  useEffect(() => {
    void ensureVideoPlaybackAudioMode();
  }, []);

  useEffect(() => {
    const start = () => {
      if (!autoPlay) return;
      try {
        player.play();
      } catch {
        // player henüz hazır değil
      }
    };

    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        start();
      }
    });

    if (player.status === 'readyToPlay') {
      start();
    }

    return () => {
      statusSub.remove();
      try {
        player.pause();
      } catch {
        // released
      }
    };
  }, [autoPlay, player, uri]);

  return (
    <View style={[styles.root, style]} collapsable={false}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        nativeControls={nativeControls}
        allowsPictureInPicture={allowsPictureInPicture}
        {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
      />
    </View>
  );
}
