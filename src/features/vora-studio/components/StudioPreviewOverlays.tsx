import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { MediaWatermarkOverlay } from '@/features/vcts/components/MediaWatermarkOverlay';
import { DraggableTextOverlay } from '@/features/vora-studio/components/DraggableTextOverlay';
import type { StudioSubtitleCue, StudioTextOverlay } from '@/features/vora-studio/types';
import { formatStudioTime } from '@/features/vora-studio/utils/time';

type StudioPreviewOverlaysProps = {
  username: string;
  playheadSec: number;
  textOverlays: StudioTextOverlay[];
  subtitles: StudioSubtitleCue[];
  showWatermark: boolean;
  textEditing?: boolean;
  selectedTextId?: string | null;
  containerWidth: number;
  containerHeight: number;
};

export function StudioPreviewOverlays({
  username,
  playheadSec,
  textOverlays,
  subtitles,
  showWatermark,
  textEditing = false,
  selectedTextId = null,
  containerWidth,
  containerHeight,
}: StudioPreviewOverlaysProps) {
  const activeSubtitle = subtitles.find(
    (item) => playheadSec >= item.startSec && playheadSec <= item.endSec,
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {showWatermark ? <MediaWatermarkOverlay username={username} /> : null}

      {textOverlays.map((item) => {
        const inTime = playheadSec >= item.startSec && playheadSec <= item.endSec;
        const visible = textEditing || inTime;
        return (
          <DraggableTextOverlay
            key={item.id}
            overlay={item}
            containerWidth={containerWidth}
            containerHeight={containerHeight}
            editable={textEditing}
            visible={visible}
            selected={selectedTextId === item.id}
          />
        );
      })}

      {activeSubtitle && !textEditing ? (
        <View style={styles.subtitleWrap} pointerEvents="none">
          <Text style={styles.subtitleText}>{activeSubtitle.text}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function StudioTimeBadge({ startSec, endSec }: { startSec: number; endSec: number }) {
  return (
    <View style={styles.timeBadge} pointerEvents="none">
      <Text style={styles.timeBadgeText}>
        {formatStudioTime(startSec)} — {formatStudioTime(endSec)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitleWrap: {
    position: 'absolute',
    bottom: 48,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  subtitleText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  timeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
