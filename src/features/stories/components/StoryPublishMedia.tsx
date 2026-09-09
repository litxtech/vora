import { StyleSheet, View, Image as RNImage, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { CapturedVideoPreview } from '@/components/media/CapturedVideoPreview';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import type { MusicSelection } from '@/features/music/types';

type StoryPublishMediaProps = {
  uri: string;
  mediaType: 'image' | 'video';
  music?: MusicSelection | null;
  videoMuted?: boolean;
  musicPlaysOnStory?: boolean;
  style?: StyleProp<ViewStyle>;
  onImageLoad?: () => void;
  onImageError?: () => void;
};

function isLocalMediaUri(uri: string): boolean {
  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('ph://') ||
    uri.startsWith('assets-library://')
  );
}

/** Hikâye paylaşım önizlemesi — gönderi editörü ile aynı yerel görsel yolu. */
export function StoryPublishMedia({
  uri,
  mediaType,
  music = null,
  videoMuted = false,
  musicPlaysOnStory = false,
  style,
  onImageLoad,
  onImageError,
}: StoryPublishMediaProps) {
  const localUri = normalizeLocalFileUri(uri);
  const hostStyle = style ? [styles.host, style] : styles.host;

  if (!localUri) {
    return <View style={hostStyle} />;
  }

  if (mediaType === 'video') {
    return (
      <View style={hostStyle} pointerEvents="none" collapsable={false}>
        <CapturedVideoPreview
          key={localUri}
          uri={localUri}
          contentFit="cover"
          music={musicPlaysOnStory ? music : null}
          videoMuted={videoMuted}
          muted={videoMuted}
        />
      </View>
    );
  }

  if (isLocalMediaUri(localUri)) {
    return (
      <View style={hostStyle} pointerEvents="none" collapsable={false}>
        <RNImage
          key={localUri}
          source={{ uri: localUri }}
          style={styles.mediaFill}
          resizeMode="cover"
          onLoad={onImageLoad}
          onError={onImageError}
        />
      </View>
    );
  }

  return (
    <View style={hostStyle} pointerEvents="none" collapsable={false}>
      <Image
        key={localUri}
        source={{ uri: localUri }}
        style={styles.mediaFill}
        contentFit="cover"
        cachePolicy="none"
        transition={0}
        onLoad={onImageLoad}
        onError={onImageError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  mediaFill: {
    width: '100%',
    height: '100%',
  },
});
