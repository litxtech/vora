import { StyleSheet, View } from 'react-native';
import { StoryLocationBadge } from '@/features/stories/components/StoryLocationBadge';
import type { StoryLocationManifest } from '@/features/stories/utils/storyManifest';
import {
  resolveStoryLocationPosition,
  STORY_LOCATION_BADGE_HEIGHT,
} from '@/features/stories/utils/storyLocation';

type StoryLocationOverlayProps = {
  location: StoryLocationManifest;
  /** Müzik rozeti ile sabit konum modunda üst üste binmeyi önle */
  useFixedFallback?: boolean;
};

export function StoryLocationOverlay({ location, useFixedFallback = false }: StoryLocationOverlayProps) {
  const position = resolveStoryLocationPosition(location);
  const hasCustomPosition = location.xNorm != null && location.yNorm != null;

  if (useFixedFallback || !hasCustomPosition) {
    return (
      <StoryLocationBadge
        label={location.label}
        subtitle={location.subtitle}
        stacked={useFixedFallback}
      />
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View
        style={[
          styles.anchor,
          {
            left: `${position.xNorm * 100}%`,
            top: `${position.yNorm * 100}%`,
            transform: [{ translateY: -STORY_LOCATION_BADGE_HEIGHT }],
          },
        ]}
        pointerEvents="none"
      >
        <StoryLocationBadge label={location.label} subtitle={location.subtitle} inline />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    zIndex: 10,
    maxWidth: '78%',
  },
});
