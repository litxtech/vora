import { useLayoutEffect, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { BootDevTimingLabel } from '@/components/splash/BootDevTimingLabel';
import { SplashDots, SPLASH_DOTS_CLUSTER_HEIGHT } from '@/components/splash/SplashDots';
import { colors } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

/** Statik fallback (native config, placeholder route). */
export const BOOT_SPLASH_BACKGROUND = colors.light.background;

type BootSplashProps = {
  onVisible?: () => void;
  bootStartedAt?: number;
};

/** Boot sırasında hafif arka plan — GradientBackground blur yok, daha akıcı. */
export function BootSplash({ onVisible, bootStartedAt }: BootSplashProps) {
  const { colors: themeColors } = useTheme();
  const { width, height } = useWindowDimensions();
  const reported = useRef(false);

  useLayoutEffect(() => {
    if (reported.current) return;
    reported.current = true;
    onVisible?.();
  }, [onVisible]);

  const dotsTop = height / 2 - SPLASH_DOTS_CLUSTER_HEIGHT / 2;

  return (
    <View style={[styles.root, { width, height, backgroundColor: themeColors.background }]}>
      {bootStartedAt != null ? <BootDevTimingLabel startedAt={bootStartedAt} /> : null}
      <View style={[styles.dotsSlot, { top: dotsTop }]} pointerEvents="box-none">
        <SplashDots />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  dotsSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
