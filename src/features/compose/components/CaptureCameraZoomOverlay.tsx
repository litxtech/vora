import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, runOnJS, useSharedValue } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { CAPTURE_MIN_DISPLAY_ZOOM } from '@/features/compose/constants/cameraZoom';
import type { useCaptureCameraZoom } from '@/features/compose/hooks/useCaptureCameraZoom';
import {
  displayToRailPosition,
  formatCaptureZoomLabel,
} from '@/features/compose/utils/cameraZoom';

type ZoomControls = Pick<
  ReturnType<typeof useCaptureCameraZoom>,
  | 'linearZoom'
  | 'displayZoom'
  | 'indicatorVisible'
  | 'activePresetId'
  | 'presets'
  | 'previewGesture'
  | 'applyPreset'
>;

type CaptureCameraZoomOverlayProps = ZoomControls & {
  enabled: boolean;
  /** Preset chip + dikey rail — kayıt sırasında kapalı */
  showManualControls?: boolean;
  bounds: {
    top: number;
    bottom: number;
    left?: number;
    right?: number;
  };
  onZoomRailChange: (position: number) => void;
  onZoomRailEnd: () => void;
  onZoomRailStart: () => void;
};

export function CaptureCameraZoomOverlay({
  enabled,
  showManualControls = true,
  bounds,
  linearZoom,
  displayZoom,
  indicatorVisible,
  activePresetId,
  presets,
  previewGesture,
  applyPreset,
  onZoomRailChange,
  onZoomRailEnd,
  onZoomRailStart,
}: CaptureCameraZoomOverlayProps) {
  const railHeight = useSharedValue(0);
  const onZoomRailChangeRef = useRef(onZoomRailChange);
  const onZoomRailEndRef = useRef(onZoomRailEnd);
  const onZoomRailStartRef = useRef(onZoomRailStart);

  useEffect(() => {
    onZoomRailChangeRef.current = onZoomRailChange;
    onZoomRailEndRef.current = onZoomRailEnd;
    onZoomRailStartRef.current = onZoomRailStart;
  }, [onZoomRailChange, onZoomRailEnd, onZoomRailStart]);

  const invokeRailChange = useCallback((position: number) => {
    onZoomRailChangeRef.current(position);
  }, []);

  const invokeRailEnd = useCallback(() => {
    onZoomRailEndRef.current();
  }, []);

  const invokeRailStart = useCallback(() => {
    onZoomRailStartRef.current();
  }, []);

  const handleRailLayout = useCallback(
    (event: LayoutChangeEvent) => {
      railHeight.value = event.nativeEvent.layout.height;
    },
    [railHeight],
  );

  const railGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled && showManualControls)
        .minDistance(4)
        .onStart(() => {
          runOnJS(invokeRailStart)();
        })
        .onUpdate((event) => {
          'worklet';
          if (railHeight.value <= 0) return;
          const position = Math.min(1, Math.max(0, event.y / railHeight.value));
          runOnJS(invokeRailChange)(position);
        })
        .onEnd(() => {
          runOnJS(invokeRailEnd)();
        }),
    [enabled, invokeRailChange, invokeRailEnd, invokeRailStart, railHeight, showManualControls],
  );

  const showChrome =
    enabled && (indicatorVisible || displayZoom > CAPTURE_MIN_DISPLAY_ZOOM + 0.02);
  const railPosition = displayToRailPosition(displayZoom);
  const showPresets = showManualControls && enabled && presets.length > 1;
  const showRail = showManualControls && showChrome;

  return (
    <>
      <GestureDetector gesture={previewGesture}>
        <View
          style={[
            styles.previewLayer,
            {
              top: bounds.top,
              bottom: bounds.bottom,
              left: bounds.left ?? 0,
              right: bounds.right ?? 0,
            },
          ]}
          accessibilityLabel="Kamera önizlemesi"
          accessibilityHint="İki parmakla 0.5x–8x arası yakınlaştırın; çift dokunarak kamerayı çevirin"
        />
      </GestureDetector>

      {showChrome ? (
        <Animated.View
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(180)}
          pointerEvents="box-none"
          style={[
            styles.chromeLayer,
            {
              top: bounds.top,
              bottom: bounds.bottom,
              left: bounds.left ?? 0,
              right: bounds.right ?? 0,
            },
          ]}
        >
          <View style={styles.zoomBadgeWrap} pointerEvents="none">
            <View style={styles.zoomBadge}>
              <Text style={styles.zoomBadgeText}>{formatCaptureZoomLabel(displayZoom)}</Text>
            </View>
          </View>

          <GestureDetector gesture={railGesture}>
            <View style={[styles.railHit, !showRail && styles.railHidden]} onLayout={handleRailLayout}>
              <View style={styles.railTrack} pointerEvents="none">
                <View style={[styles.railFill, { height: `${railPosition * 100}%` }]} />
                <View style={[styles.railThumb, { top: `${railPosition * 100}%` }]} />
              </View>
            </View>
          </GestureDetector>
        </Animated.View>
      ) : null}

      {showPresets ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.presetBar,
            {
              bottom: bounds.bottom + 72,
              left: bounds.left ?? 0,
              right: bounds.right ?? 0,
            },
          ]}
        >
          {presets.map((preset) => {
            const active = activePresetId === preset.id;
            return (
              <Pressable
                key={preset.id}
                style={[styles.presetChip, active && styles.presetChipActive]}
                onPress={() => applyPreset(preset)}
                hitSlop={8}
              >
                <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  previewLayer: {
    position: 'absolute',
    zIndex: 5,
    elevation: 5,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  chromeLayer: {
    position: 'absolute',
    zIndex: 6,
    elevation: 6,
  },
  zoomBadgeWrap: {
    position: 'absolute',
    top: spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  zoomBadge: {
    minWidth: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
  },
  zoomBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  railHit: {
    position: 'absolute',
    right: spacing.sm,
    top: '18%',
    bottom: '22%',
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  railHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  railTrack: {
    width: 4,
    flex: 1,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'visible',
  },
  railFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  railThumb: {
    position: 'absolute',
    left: -5,
    width: 14,
    height: 14,
    marginTop: -7,
    borderRadius: radius.full,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.35)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.28,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  presetBar: {
    position: 'absolute',
    zIndex: 8,
    elevation: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  presetChip: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  presetChipActive: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  presetChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  presetChipTextActive: {
    color: '#000',
  },
});
