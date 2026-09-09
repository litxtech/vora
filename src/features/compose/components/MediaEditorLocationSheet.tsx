import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { MediaEditorBottomSheet } from '@/features/compose/components/MediaEditorBottomSheet';
import { useMediaEditorSheetTopInset } from '@/features/compose/hooks/useMediaEditorSheetTopInset';
import { LocationPicker, type SelectedLocation } from '@/features/compose/components/LocationPicker';
import type { RegionId } from '@/constants/regions';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  regionId: RegionId;
  value: SelectedLocation | null;
  onChange: (location: SelectedLocation | null) => void;
  onClose: () => void;
};

export function MediaEditorLocationSheet({
  visible,
  regionId,
  value,
  onChange,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const sheetTopInset = useMediaEditorSheetTopInset();

  return (
    <MediaEditorBottomSheet
      visible={visible}
      onClose={onClose}
      title="Konum"
      topInset={sheetTopInset}
      headerRight={
        <Pressable onPress={onClose} hitSlop={12} style={styles.doneBtn}>
          <Text style={[styles.done, { color: colors.primary }]}>Bitti</Text>
        </Pressable>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
      >
        <Text variant="caption" secondary style={styles.hint}>
          Dünya genelinde konum ara; yakınındaki öneriler önce gelir. Etiketi görsel üzerinde sürükleyebilirsin.
        </Text>
        <LocationPicker regionId={regionId} value={value} onChange={onChange} compact scope="world" />
      </ScrollView>
    </MediaEditorBottomSheet>
  );
}

const styles = StyleSheet.create({
  doneBtn: {
    minHeight: 44,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  done: {
    fontWeight: '700',
    fontSize: 16,
  },
  hint: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
});
