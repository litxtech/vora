import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { isPlayableVideoUrl, toVideoSource } from '@/lib/media/videoSource';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';

type CapLoopVideoProps = {
  videoUrl: string;
  posterUrl?: string | null;
  style?: StyleProp<ViewStyle>;
  contentFit?: 'contain' | 'cover';
  muted?: boolean;
  /** false: VideoView mount etme (liste kaydırma titremesini önler). */
  playing?: boolean;
  /** false: bir kez oynar, bitince onEnd. */
  loop?: boolean;
  onEnd?: () => void;
};

/** Caps sticker: sessiz, döngülü kısa video. */
export function CapLoopVideo({
  videoUrl,
  posterUrl,
  style,
  contentFit = 'cover',
  muted = true,
  playing = true,
  loop = true,
  onEnd,
}: CapLoopVideoProps) {
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const uri = useMemo(() => {
    const raw = videoUrl.trim();
    if (!raw) return '';
    if (raw.startsWith('file://') || raw.startsWith('content://') || raw.startsWith('/')) {
      return normalizeLocalFileUri(raw);
    }
    return raw;
  }, [videoUrl]);

  const playable = Boolean(uri) && isPlayableVideoUrl(uri) && playing;
  const [frameReady, setFrameReady] = useState(false);
  const player = useVideoPlayer(playable ? toVideoSource(uri) : null, (p) => {
    p.loop = loop;
    p.muted = muted;
    p.play();
  });

  useEffect(() => {
    setFrameReady(false);
  }, [uri, playable]);

  useEffect(() => {
    if (!player || !playable) return;
    player.loop = loop;
    player.muted = muted;
    player.play();

    const markReady = () => setFrameReady(true);
    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) markReady();
    });
    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') markReady();
    });
    const endSub = player.addListener('playToEnd', () => {
      if (!loop) onEndRef.current?.();
    });
    return () => {
      playingSub.remove();
      statusSub.remove();
      endSub.remove();
    };
  }, [player, muted, playable, loop]);

  if (!playable) {
    if (posterUrl) {
      return <Image source={{ uri: posterUrl }} style={[styles.fill, style]} contentFit={contentFit} />;
    }
    return <View style={style} />;
  }

  return (
    <View style={[styles.root, style]} collapsable={false}>
      {posterUrl && !frameReady ? (
        <Image
          source={{ uri: posterUrl }}
          style={styles.poster}
          contentFit={contentFit}
          recyclingKey={posterUrl}
        />
      ) : null}
      <VideoView
        player={player}
        style={styles.video}
        contentFit={contentFit}
        nativeControls={false}
        allowsPictureInPicture={false}
        pointerEvents="none"
        {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  fill: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});
