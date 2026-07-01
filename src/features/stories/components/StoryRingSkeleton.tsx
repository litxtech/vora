import { ScrollView, StyleSheet, View } from 'react-native';
import { STORY_RING_AVATAR_SIZE } from '@/features/stories/constants';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const PLACEHOLDER_COUNT = 5;
const size = STORY_RING_AVATAR_SIZE;

export function StoryRingSkeleton() {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      scrollEnabled={false}
    >
      {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
        <View key={index} style={styles.item}>
          <View style={[styles.ring, { borderColor: `${colors.border}88` }]}>
            <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]} />
          </View>
          <View style={[styles.label, { backgroundColor: colors.surfaceElevated }]} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  item: {
    width: size + 8,
    alignItems: 'center',
    gap: spacing.xs,
  },
  ring: {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: size - 8,
    height: size - 8,
    borderRadius: (size - 8) / 2,
  },
  label: {
    width: size,
    height: 10,
    borderRadius: 5,
  },
});
