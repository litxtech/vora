import { memo } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import type { CapOverlayStyle } from '@/features/caps/types';
import { spacing } from '@/constants/theme';

type CapOverlayLayerProps = {
  overlay?: CapOverlayStyle | null;
};

export const CapOverlayLayer = memo(function CapOverlayLayer({ overlay }: CapOverlayLayerProps) {
  if (!overlay) return null;
  const color = overlay.color ?? '#FFFFFF';
  const stroke = overlay.strokeColor ?? '#000000';
  const strokeW = overlay.strokeWidth ?? (overlay.effect === 'outline' ? 2 : 0);
  const textShadow =
    overlay.effect === 'shadow' || overlay.effect === 'neon'
      ? {
          textShadowColor: overlay.effect === 'neon' ? color : 'rgba(0,0,0,0.75)',
          textShadowOffset: { width: 0, height: overlay.effect === 'neon' ? 0 : 1 },
          textShadowRadius: overlay.effect === 'neon' ? 10 : 3,
        }
      : null;

  const fontFamily =
    overlay.fontFamily === 'serif'
      ? 'Georgia'
      : overlay.fontFamily === 'mono'
        ? 'Courier'
        : undefined;

  const top = overlay.topText?.trim();
  const bottom = overlay.bottomText?.trim();
  const emoji = overlay.emoji?.trim();
  if (!top && !bottom && !emoji) return null;

  const position = overlay.position ?? 'center';
  const justify =
    position === 'top' ? 'flex-start' : position === 'bottom' ? 'flex-end' : 'space-between';

  return (
    <View style={[styles.root, { justifyContent: justify }]} pointerEvents="none">
      {emoji ? <RNText style={styles.emoji}>{emoji}</RNText> : null}
      {top ? (
        <RNText
          style={[
            styles.text,
            styles.top,
            { color, fontFamily },
            strokeW > 0 ? { textShadowColor: stroke, textShadowRadius: strokeW * 2 } : null,
            textShadow,
          ]}
          numberOfLines={2}
        >
          {top}
        </RNText>
      ) : null}
      {bottom ? (
        <RNText
          style={[
            styles.text,
            styles.bottom,
            { color, fontFamily },
            strokeW > 0 ? { textShadowColor: stroke, textShadowRadius: strokeW * 2 } : null,
            textShadow,
          ]}
          numberOfLines={2}
        >
          {bottom}
        </RNText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  emoji: {
    position: 'absolute',
    top: '42%',
    alignSelf: 'center',
    fontSize: 42,
  },
  text: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  top: { marginTop: spacing.sm },
  bottom: { marginBottom: spacing.sm },
});
