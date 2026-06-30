import { ActivityIndicator, StyleSheet, View } from 'react-native';

/** Thumbnail hazır olana kadar statik placeholder — VideoView kullanılmaz (tam ekran oynatıcıyla çakışmayı önler). */
export function ChatVideoPreviewFrame() {
  return (
    <View style={styles.root} pointerEvents="none">
      <ActivityIndicator color="rgba(255,255,255,0.7)" size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121820',
  },
});
