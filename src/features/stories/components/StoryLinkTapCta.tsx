import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { storyLinkWithAlpha } from '@/features/stories/constants/storyLinkColors';
import type { StoryLinkManifest } from '@/features/stories/utils/storyLinks';

type StoryLinkTapCtaProps = {
  link: StoryLinkManifest;
  onPress?: () => void;
  preview?: boolean;
  bottomOffset?: number;
};

export function StoryLinkTapCta({
  link,
  onPress,
  preview = false,
  bottomOffset,
}: StoryLinkTapCtaProps) {
  const pulse = useSharedValue(1);
  const isGlass = link.backgroundColor.startsWith('rgba');
  const bottom = bottomOffset ?? (preview ? spacing.lg : spacing.xl + 44);

  useEffect(() => {
    if (preview || !onPress) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.045, { duration: 1050, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1050, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [onPress, preview, pulse]);

  const pillAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Pressable
      style={[styles.wrap, { bottom }]}
      onPress={onPress}
      disabled={!onPress}
      pointerEvents={onPress ? 'auto' : 'box-none'}
      accessibilityRole="button"
      accessibilityLabel={`${link.label} bağlantısını aç`}
    >
      <Animated.View
        style={[
          styles.pill,
          pillAnimStyle,
          {
            backgroundColor: link.backgroundColor,
            borderColor: isGlass
              ? 'rgba(255,255,255,0.5)'
              : storyLinkWithAlpha(link.textColor, 0.28),
            shadowColor: isGlass ? '#000' : link.backgroundColor,
          },
          isGlass ? styles.glassPill : styles.solidPill,
        ]}
      >
        <View style={[styles.iconBadge, { backgroundColor: storyLinkWithAlpha(link.textColor, 0.16) }]}>
          <Ionicons name="link" size={14} color={link.textColor} />
        </View>
        <Text variant="caption" style={[styles.label, { color: link.textColor }]} numberOfLines={1}>
          {link.label}
        </Text>
        <View style={[styles.divider, { backgroundColor: storyLinkWithAlpha(link.textColor, 0.32) }]} />
        <View style={styles.tapHint}>
          <Text variant="caption" style={[styles.hint, { color: link.textColor }]}>
            Dokun
          </Text>
          <Ionicons name="chevron-forward" size={13} color={link.textColor} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
    zIndex: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderRadius: 999,
    maxWidth: '100%',
    borderWidth: 1.5,
  },
  solidPill: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 6,
  },
  glassPill: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.15,
    flexShrink: 1,
  },
  divider: {
    width: 1,
    height: 14,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  hint: {
    fontWeight: '700',
    fontSize: 12,
    opacity: 0.9,
  },
});
