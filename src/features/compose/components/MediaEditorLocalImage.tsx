import { StyleSheet, View, Image as RNImage } from 'react-native';
import { Image } from 'expo-image';

type Props = {
  uri: string;
  rotationDeg?: number;
};

function isLocalMediaUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://');
}

/** Tam boy kutuyu doldurur — dış zoom katmanı contain ölçüsünü hesaplar. */
export function MediaEditorLocalImage({ uri, rotationDeg = 0 }: Props) {
  const transform = rotationDeg ? [{ rotate: `${rotationDeg}deg` }] : undefined;

  if (isLocalMediaUri(uri)) {
    return (
      <View style={[styles.layer, transform ? { transform } : null]}>
        <RNImage source={{ uri }} style={styles.image} resizeMode="contain" />
      </View>
    );
  }

  return (
    <View style={[styles.layer, transform ? { transform } : null]}>
      <Image source={{ uri }} style={styles.image} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
