import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaEditorBottomSheet } from '@/features/compose/components/MediaEditorBottomSheet';
import { Text } from '@/components/ui/Text';
import { STORY_STICKER_CATEGORIES, type StoryStickerCategoryId } from '@/features/stories/constants';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type StoryStickerSheetProps = {
  visible: boolean;
  selected: StoryStickerCategoryId | null;
  onSelect: (id: StoryStickerCategoryId | null) => void;
  onClose: () => void;
};

export function StoryStickerSheet({ visible, selected, onSelect, onClose }: StoryStickerSheetProps) {
  const { colors } = useTheme();

  return (
    <MediaEditorBottomSheet visible={visible} onClose={onClose} title="Kategori etiketi">
      <View style={styles.grid}>
        {STORY_STICKER_CATEGORIES.map((item) => {
          const active = selected === item.id;
          return (
            <Pressable
              key={item.id}
              style={[styles.chip, active && { borderColor: colors.primary, backgroundColor: `${colors.primary}22` }]}
              onPress={() => onSelect(active ? null : item.id)}
            >
              <Ionicons name={item.icon} size={18} color={active ? colors.primary : '#fff'} />
              <Text variant="caption" style={[styles.chipLabel, active && { color: colors.primary }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selected ? (
        <Pressable style={styles.clearBtn} onPress={() => onSelect(null)}>
          <Text variant="caption" style={{ color: colors.textMuted }}>
            Etiketi kaldır
          </Text>
        </Pressable>
      ) : null}
    </MediaEditorBottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  clearBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
