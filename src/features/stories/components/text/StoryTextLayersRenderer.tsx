import { useCallback, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text as RNText, View } from 'react-native';
import type { StudioTextOverlay } from '@/features/vora-studio/types';
import { resolveStoryTextAppearance } from '@/features/stories/utils/storyTextAppearance';
import { clampStoryTextPosition } from '@/features/stories/utils/storyTextLayer';

type StoryTextLayersRendererProps = {
  layers: StudioTextOverlay[];
  layoutWidth?: number;
  layoutHeight?: number;
  showPlaceholderForId?: string | null;
};

function resolveLayerPositionStyle(
  item: StudioTextOverlay,
  width: number,
  height: number,
  scale: number,
  rotationDeg: number,
) {
  const anchor = item.anchor ?? 'center';
  const { x, y } = clampStoryTextPosition(item.x, item.y);
  const left = x * width;
  const top = y * height;
  const rotate = { rotate: `${rotationDeg}deg` as const };
  const scaleTransform = { scale };

  if (anchor === 'center') {
    return {
      left,
      top,
      maxWidth: width * 0.88,
      transform: [
        { translateX: '-50%' },
        { translateY: '-50%' },
        rotate,
        scaleTransform,
      ],
    };
  }

  return {
    left,
    top,
    maxWidth: width * 0.88,
    transform: [rotate, scaleTransform],
  };
}

/** Salt okunur metin katmanları — izleyici ve export önizleme */
export function StoryTextLayersRenderer({
  layers,
  layoutWidth = 0,
  layoutHeight = 0,
  showPlaceholderForId = null,
}: StoryTextLayersRendererProps) {
  const [measured, setMeasured] = useState({ width: 0, height: 0 });

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (layoutWidth > 8 && layoutHeight > 8) return;
      const { width, height } = event.nativeEvent.layout;
      if (width > 8 && height > 8) {
        setMeasured({ width, height });
      }
    },
    [layoutHeight, layoutWidth],
  );

  const width = layoutWidth > 8 ? layoutWidth : measured.width;
  const height = layoutHeight > 8 ? layoutHeight : measured.height;
  const canPosition = width > 8 && height > 8;

  const visible = layers.filter(
    (item) => item.text.trim() || item.id === showPlaceholderForId,
  );
  if (visible.length === 0) return null;

  return (
    <View
      style={[
        styles.layer,
        canPosition ? { width, height } : StyleSheet.absoluteFillObject,
      ]}
      onLayout={onLayout}
      pointerEvents="none"
      collapsable={false}
    >
      {canPosition
        ? visible.map((item) => {
            const scale = item.scale ?? 1;
            const rotationDeg = item.rotationDeg ?? 0;
            const appearance = resolveStoryTextAppearance(item, {
              showPlaceholder: item.id === showPlaceholderForId && !item.text.trim(),
            });

            return (
              <View
                key={item.id}
                style={[
                  styles.wrap,
                  resolveLayerPositionStyle(item, width, height, scale, rotationDeg),
                ]}
                collapsable={false}
              >
                {appearance.backgroundStyle ? (
                  <View style={appearance.backgroundStyle}>
                    <RNText style={[styles.text, appearance.textStyle]} numberOfLines={12}>
                      {appearance.label}
                    </RNText>
                  </View>
                ) : (
                  <RNText style={[styles.text, appearance.textStyle]} numberOfLines={12}>
                    {appearance.label}
                  </RNText>
                )}
              </View>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 80,
    elevation: 80,
    overflow: 'visible',
  },
  wrap: {
    position: 'absolute',
  },
  text: {
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
});
