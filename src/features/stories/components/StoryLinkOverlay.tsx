import { StyleSheet, View } from 'react-native';
import { StoryLinkButton } from '@/features/stories/components/StoryLinkButton';
import { StoryLinkTapCta } from '@/features/stories/components/StoryLinkTapCta';
import { StorySwipeUpCta } from '@/features/stories/components/StorySwipeUpCta';
import type { StoryLinkManifest } from '@/features/stories/utils/storyLinks';

type StoryLinkOverlayProps = {
  links: StoryLinkManifest[];
  onLinkPress?: (link: StoryLinkManifest) => void;
  singleLinkMode?: 'swipe_up' | 'button';
  preview?: boolean;
};

export function StoryLinkOverlay({
  links,
  onLinkPress,
  singleLinkMode = 'swipe_up',
  preview = false,
}: StoryLinkOverlayProps) {
  if (links.length === 0) return null;

  if (links.length === 1 && singleLinkMode === 'swipe_up') {
    return (
      <StorySwipeUpCta
        link={links[0]}
        onPress={onLinkPress ? () => onLinkPress(links[0]) : undefined}
        preview={preview}
      />
    );
  }

  if (links.length === 1 && singleLinkMode === 'button') {
    return (
      <StoryLinkTapCta
        link={links[0]}
        onPress={onLinkPress ? () => onLinkPress(links[0]) : undefined}
        preview={preview}
      />
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {links.map((link) => (
        <View
          key={link.id}
          pointerEvents="box-none"
          style={[
            styles.anchor,
            {
              left: `${link.xNorm * 100}%`,
              top: `${link.yNorm * 100}%`,
            },
          ]}
        >
          <StoryLinkButton
            link={link}
            onPress={onLinkPress ? () => onLinkPress(link) : undefined}
            compact={preview}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    zIndex: 12,
  },
});
