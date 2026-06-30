import { useLayoutEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { BootSplash } from '@/components/splash/BootSplash';
import { useBootNavigation } from '@/features/auth/hooks/useBootNavigation';
import { shouldBootOverlayBlockTouches, shouldShowBootSplashVisual } from '@/lib/device/androidPerfProfile';
import { releaseNativeSplash } from '@/lib/boot/nativeSplash';

/**
 * Tam ekran overlay (Modal yok — Android/iOS aynı, daha az takılma).
 * Feed altta yüklenir, animasyon bitince overlay kapanır.
 */
export function BootOrchestrator() {
  const splashVisibleAt = useRef<number | null>(null);
  const bootStartedAt = useRef(Date.now());

  useLayoutEffect(() => {
    if (splashVisibleAt.current == null) {
      splashVisibleAt.current = Date.now();
    }
    releaseNativeSplash();
  }, []);

  const markSplashVisible = () => {
    if (splashVisibleAt.current == null) {
      splashVisibleAt.current = Date.now();
    }
  };

  const isBooting = useBootNavigation(splashVisibleAt);

  if (!isBooting || !shouldShowBootSplashVisual()) return null;

  return (
    <View
      style={styles.overlay}
      pointerEvents={shouldBootOverlayBlockTouches() ? 'auto' : 'none'}
      collapsable={false}
    >
      <BootSplash onVisible={markSplashVisible} bootStartedAt={bootStartedAt.current} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
});
