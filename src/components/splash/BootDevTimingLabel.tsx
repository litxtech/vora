import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BootDevTimingLabelProps = {
  startedAt: number;
};

/** Geliştirmede boot süresini üstte gösterir — production'da render yok. */
export function BootDevTimingLabel({ startedAt }: BootDevTimingLabelProps) {
  const insets = useSafeAreaInsets();
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const tick = () => setElapsedMs(Date.now() - startedAt);
    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!__DEV__) return null;

  return (
    <View style={[styles.wrap, { top: insets.top + 4 }]} pointerEvents="none">
      <Text style={styles.text}>{elapsedMs} ms</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  text: {
    color: 'rgba(154, 168, 188, 0.85)',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
});
