import { Pressable, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from '@/components/ui/Text';
import { MediaEditorBottomSheet } from '@/features/compose/components/MediaEditorBottomSheet';
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

  return (
    <MediaEditorBottomSheet
      visible={visible}
      onClose={onClose}
      title="Konum"
      headerRight={
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={[styles.done, { color: colors.primary }]}>Bitti</Text>
        </Pressable>
      }
    >
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bottomOffset={24}
      >
        <Text variant="caption" secondary style={styles.hint}>
          Konum etiketini görselin üzerinde istediğin yere sürükleyebilirsin
        </Text>
        <LocationPicker regionId={regionId} value={value} onChange={onChange} compact />
      </KeyboardAwareScrollView>
    </MediaEditorBottomSheet>
  );
}

const styles = StyleSheet.create({
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
