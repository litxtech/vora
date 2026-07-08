import { Image as RNImage, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { CapturedVideoPreview } from '@/components/media/CapturedVideoPreview';
import type { MusicSelection } from '@/features/music/types';

type StoryPublishMediaProps = {
  uri: string;
  mediaType: 'image' | 'video';
  music?: MusicSelection | null;
  videoMuted?: boolean;
  musicPlaysOnStory?: boolean;
  style?: StyleProp<ViewStyle>;
};

function isLocalMediaUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://');
}

/** Hikâye önizlemesi — yerel dosyalarda RN Image (transform içinde daha güvenilir). */
export function StoryPublishMedia({
  uri,
  mediaType,
  music = null,
  videoMuted = false,
  musicPlaysOnStory = false,
  style,
}: StoryPublishMediaProps) {
  const fillStyle = style ?? styles.fill;

  if (!uri) {
    return <View style={fillStyle} />;
  }

  if (mediaType === 'video') {
    return (
      <View style={fillStyle} pointerEvents="none">
        <CapturedVideoPreview
          uri={uri}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          music={musicPlaysOnStory ? music : null}
          videoMuted={videoMuted}
          muted={videoMuted}
        />
      </View>
    );
  }

  if (isLocalMediaUri(uri)) {
    return (
      <RNImage
        source={{ uri }}
        style={fillStyle}
        resizeMode="cover"
        pointerEvents="none"
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={fillStyle}
      contentFit="cover"
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});
