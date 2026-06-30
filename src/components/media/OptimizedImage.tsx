import { memo, useMemo, useState } from 'react';
import { Image, type ImageContentFit, type ImageProps, type ImageStyle } from 'expo-image';
import { StyleSheet, type StyleProp } from 'react-native';
import { optimizedImageUrl } from '@/lib/media/optimizedImageUrl';
import type { ImageSizeTier } from '@/lib/device/androidPerfProfile';

type OptimizedImageProps = {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  tier?: ImageSizeTier;
  layoutWidth?: number;
  recyclingKey?: string;
  transition?: number;
} & Pick<ImageProps, 'onLoad' | 'accessibilityLabel'>;

export const OptimizedImage = memo(function OptimizedImage({
  uri,
  style,
  contentFit = 'cover',
  tier = 'feed',
  layoutWidth,
  recyclingKey,
  transition = 0,
  onLoad,
  accessibilityLabel,
}: OptimizedImageProps) {
  const [useOriginal, setUseOriginal] = useState(false);

  const trimmedUri = uri?.trim() ?? null;

  const source = useMemo(() => {
    if (!trimmedUri) return null;
    if (useOriginal) return trimmedUri;
    return optimizedImageUrl(trimmedUri, tier, layoutWidth) ?? trimmedUri;
  }, [trimmedUri, tier, layoutWidth, useOriginal]);

  if (!source) return null;

  return (
    <Image
      source={{ uri: source }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      recyclingKey={recyclingKey ?? source}
      transition={transition}
      onLoad={onLoad}
      onError={() => {
        if (!useOriginal && trimmedUri) setUseOriginal(true);
      }}
      accessibilityLabel={accessibilityLabel}
    />
  );
});

export const optimizedImageAbsoluteFill = StyleSheet.absoluteFillObject;
