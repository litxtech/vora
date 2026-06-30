import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { RtcSurfaceView, RtcTextureView, type VideoCanvas } from 'react-native-agora';

type CallRtcViewProps = {
  canvas: VideoCanvas;
  style?: StyleProp<ViewStyle>;
  /** Küçük PiP / üst üste bindirme — Android'de TextureView + z-order. */
  pip?: boolean;
};

export function CallRtcView({ canvas, style, pip = false }: CallRtcViewProps) {
  const viewStyle = [styles.fill, style];

  if (pip && Platform.OS === 'android') {
    return <RtcTextureView canvas={canvas} style={viewStyle} />;
  }

  return <RtcSurfaceView canvas={canvas} style={viewStyle} />;
}

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
});
