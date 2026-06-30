import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { MEDIA_EDITOR_STICKERS } from '@/features/compose/constants/mediaEditor';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  onPick: (emoji: string) => void;
  onClose: () => void;
};

export function MediaEditorStickerPanel({ visible, onPick, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.sm, backgroundColor: colors.surfaceElevated }]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Bitti</Text>
        </Pressable>
        <Text variant="label">Çıkartma</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {MEDIA_EDITOR_STICKERS.map((emoji) => (
          <Pressable
            key={emoji}
            style={[styles.cell, { backgroundColor: `${colors.textMuted}10` }]}
            onPress={() => onPick(emoji)}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 68,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    maxHeight: '42%',
    zIndex: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerSpacer: {
    width: 48,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  cell: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
  },
});
