import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { MediaEditorBottomSheet } from '@/features/compose/components/MediaEditorBottomSheet';
import { STORY_FRAMING_BACKGROUNDS } from '@/features/stories/utils/storyFraming';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type StoryBackgroundSheetProps = {
  visible: boolean;
  selected: string;
  onSelect: (color: string) => void;
  onClose: () => void;
};

export function StoryBackgroundSheet({ visible, selected, onSelect, onClose }: StoryBackgroundSheetProps) {
  const { colors } = useTheme();

  return (
    <MediaEditorBottomSheet visible={visible} onClose={onClose} title="Arka plan rengi">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {STORY_FRAMING_BACKGROUNDS.map((color) => {
          const active = selected === color;
          return (
            <Pressable
              key={color}
              onPress={() => onSelect(color)}
              style={[
                styles.swatch,
                { backgroundColor: color },
                active && { borderColor: colors.primary, borderWidth: 2 },
              ]}
            />
          );
        })}
      </ScrollView>
    </MediaEditorBottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});
