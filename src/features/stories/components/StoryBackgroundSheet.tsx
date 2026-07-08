import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
    <MediaEditorBottomSheet visible={visible} onClose={onClose} title="Arka plan rengi" heightFraction={0.36}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.row}>
          {STORY_FRAMING_BACKGROUNDS.map((color) => {
            const active = selected.toLowerCase() === color.toLowerCase();
            const isLight = color === '#ffffff' || color === '#f2f2f7' || color === '#e5e5ea' || color === '#ffcc00' || color === '#ffd60a';
            return (
              <Pressable
                key={color}
                onPress={() => onSelect(color)}
                style={[
                  styles.swatch,
                  { backgroundColor: color },
                  isLight && styles.swatchLight,
                  active && { borderColor: colors.primary, borderWidth: 2.5 },
                ]}
              />
            );
          })}
        </View>
      </ScrollView>
    </MediaEditorBottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  swatchLight: {
    borderColor: 'rgba(0,0,0,0.12)',
  },
});
