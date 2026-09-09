import { Image, type ImageContentFit } from 'expo-image';
import { StyleSheet, type StyleProp, type ImageStyle } from 'react-native';
import { resolveStoryMediaUrl } from '@/features/stories/services/storyMediaUrl';

type StoryMediaImageProps = {
  uri: string | null | undefined;
  recyclingKey?: string;
  contentFit?: ImageContentFit;
  style?: StyleProp<ImageStyle>;
};

/** Hikâye görselleri — Supabase render URL Android'de boş dönebildiği için doğrudan public URL. */
export function StoryMediaImage({
  uri,
  recyclingKey,
  contentFit = 'cover',
  style,
}: StoryMediaImageProps) {
  const resolved = resolveStoryMediaUrl(uri);
  if (!resolved) return null;

  return (
    <Image
      source={{ uri: resolved }}
      style={style ?? styles.fill}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      recyclingKey={recyclingKey ?? resolved}
      transition={0}
    />
  );
}

const styles = StyleSheet.create({
  fill: StyleSheet.absoluteFillObject,
});
