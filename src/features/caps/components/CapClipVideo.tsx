import { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { isPlayableVideoUrl, toVideoSource } from '@/lib/media/videoSource';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';

type CapClipVideoProps = {
  videoUrl: string;
  posterUrl?: string | null;
  startMs?: number | null;
  endMs?: number | null;
  style?: StyleProp<ViewStyle>;
  contentFit?: 'contain' | 'cover';
  muted?: boolean;
  playing?: boolean;
};

/**
 * Caps önizleme: start/end aralığında seek-loop.
 * Videoyu yeniden encode etmez.
 */
export function CapClipVideo({
  videoUrl,
  posterUrl,
  startMs = 0,
  endMs = null,
  style,
  contentFit = 'contain',
  muted = true,
  playing = true,
}: CapClipVideoProps) {
  const uri = useMemo(() => {
    const raw = videoUrl.trim();
    if (!raw) return '';
    if (raw.startsWith('file://') || raw.startsWith('content://') || raw.startsWith('/')) {
      return normalizeLocalFileUri(raw);
    }
    return raw;
  }, [videoUrl]);

  const startSec = Math.max(0, (startMs ?? 0) / 1000);
  const endSec = endMs != null && endMs > (startMs ?? 0) ? endMs / 1000 : null;
  const playable = Boolean(uri) && isPlayableVideoUrl(uri) && playing;
  const lastTickRef = useRef(startSec);

  const player = useVideoPlayer(playable ? toVideoSource(uri) : null, (p) => {
    p.loop = endSec == null;
    p.muted = muted;
    p.currentTime = startSec;
    p.play();
  });

  useEffect(() => {
    if (!player) return;
    player.muted = muted;
    player.loop = endSec == null;
  }, [player, muted, endSec]);

  useEffect(() => {
    if (!player) return;
    player.currentTime = startSec;
    lastTickRef.current = startSec;
    void player.play();
  }, [player, startSec, endSec, uri]);

  useEffect(() => {
    if (!player || endSec == null) return;

    const id = setInterval(() => {
      const t = player.currentTime;
      if (t >= endSec - 0.05 || t < startSec - 0.05) {
        player.currentTime = startSec;
        lastTickRef.current = startSec;
      } else {
        lastTickRef.current = t;
      }
    }, 80);

    return () => clearInterval(id);
  }, [player, startSec, endSec]);

  if (!playable) {
    if (posterUrl) {
      return <Image source={{ uri: posterUrl }} style={[styles.fill, style]} contentFit={contentFit} />;
    }
    return <View style={style} />;
  }

  return (
    <View style={[styles.root, style]} collapsable={false}>
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={styles.poster} contentFit={contentFit} />
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
  root: { overflow: 'hidden', backgroundColor: 'transparent' },
  fill: { width: '100%', height: '100%', backgroundColor: 'transparent' },
  video: { width: '100%', height: '100%', backgroundColor: 'transparent' },
  poster: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
});
