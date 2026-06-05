import { useEffect, useRef } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { getMuxPlaybackUrl } from '@/lib/mux/client';
import type { ReelItem } from '@/features/reels/types';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

type ReelPlayerProps = {
  item: ReelItem;
  isActive: boolean;
};

export function ReelPlayer({ item, isActive }: ReelPlayerProps) {
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && item.playbackId) {
      videoRef.current.playAsync().catch(() => undefined);
    } else {
      videoRef.current.pauseAsync().catch(() => undefined);
    }
  }, [isActive, item.playbackId]);

  return (
    <View style={styles.container}>
      {item.playbackId && isActive ? (
        <Video
          ref={videoRef}
          source={{ uri: getMuxPlaybackUrl(item.playbackId) }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={isActive}
          isMuted={false}
        />
      ) : item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.video} resizeMode="cover" />
      ) : (
        <LinearGradient colors={['#0A1628', '#1A3A5C', '#0D2137']} style={styles.video}>
          <Text style={styles.demoText}>🎬</Text>
        </LinearGradient>
      )}

      {item.isDemo ? (
        <View style={styles.demoBadge}>
          <Text variant="caption" style={{ color: '#FFB300' }}>
            Örnek Reel
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoText: { fontSize: 64 },
  demoBadge: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
