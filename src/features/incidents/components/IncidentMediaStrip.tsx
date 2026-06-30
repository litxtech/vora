import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { radius, spacing } from '@/constants/theme';

type Props = {
  urls: string[];
};

/** Olay/gelişme medyalarını küçük kareler halinde gösterir, dokununca tam ekran açılır. */
export function IncidentMediaStrip({ urls }: Props) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (!urls || urls.length === 0) return null;

  return (
    <>
      <View style={styles.row}>
        {urls.map((url, index) => {
          const video = isVideoUrl(url);
          return (
            <Pressable
              key={`${url}-${index}`}
              onPress={() => setViewerIndex(index)}
              style={[styles.tile, urls.length === 1 && styles.tileSingle]}
            >
              <Image source={{ uri: url }} style={styles.image} contentFit="cover" />
              {video ? (
                <View style={styles.playOverlay}>
                  <Ionicons name="play" size={22} color="#fff" />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <FullScreenMediaViewer
        urls={urls}
        visible={viewerIndex !== null}
        startIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tile: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  tileSingle: {
    width: '100%',
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
});
