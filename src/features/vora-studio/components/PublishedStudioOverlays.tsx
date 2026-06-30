import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { DraggableTextOverlay } from '@/features/vora-studio/components/DraggableTextOverlay';
import type { PublishedEditManifest } from '@/features/vora-studio/types';

type PublishedStudioOverlaysProps = {
  editManifest: PublishedEditManifest | null | undefined;
  playheadSec: number;
  containerWidth: number;
  containerHeight: number;
};

function PublishedStudioOverlaysInner({
  editManifest,
  playheadSec,
  containerWidth,
  containerHeight,
}: PublishedStudioOverlaysProps) {
  if (!editManifest?.textOverlays?.length || containerWidth <= 0 || containerHeight <= 0) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {editManifest.textOverlays.map((item) => {
        const visible = playheadSec >= item.startSec && playheadSec <= item.endSec;
        if (!visible || !item.text.trim()) return null;

        return (
          <DraggableTextOverlay
            key={item.id}
            overlay={item}
            containerWidth={containerWidth}
            containerHeight={containerHeight}
            editable={false}
            visible
            selected={false}
          />
        );
      })}
    </View>
  );
}

export const PublishedStudioOverlays = memo(PublishedStudioOverlaysInner);
