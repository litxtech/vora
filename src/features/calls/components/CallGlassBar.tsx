import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { shouldSkipUiBlur } from '@/lib/device/androidPerfProfile';
import { CALL_DESIGN } from '@/features/calls/constants';

type CallGlassBarProps = ViewProps & {
  children: React.ReactNode;
  animate?: boolean;
};

/** Alt kontrol çubuğu — buzlu cam panel (FaceTime / WhatsApp tarzı). */
export function CallGlassBar({ children, style, animate = true, ...props }: CallGlassBarProps) {
  const content = (
    <View style={[styles.inner, style]} {...props}>
      {children}
    </View>
  );

  const shell = shouldSkipUiBlur() ? (
    <View style={styles.fallback}>{content}</View>
  ) : (
    <BlurView intensity={42} tint="dark" style={styles.blur}>
      <View style={styles.tint} />
      {content}
    </BlurView>
  );

  if (!animate) return shell;

  return (
    <Animated.View entering={FadeInUp.duration(380).springify()} style={styles.wrap}>
      {shell}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  blur: {
    borderRadius: CALL_DESIGN.glassBarRadius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  fallback: {
    borderRadius: CALL_DESIGN.glassBarRadius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(18, 24, 32, 0.88)',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  inner: {
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
});
