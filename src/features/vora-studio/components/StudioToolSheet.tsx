import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { StudioToolPanel } from '@/features/vora-studio/components/StudioToolPanel';
import { STUDIO_TOOLS } from '@/features/vora-studio/constants';
import { useStudioEditorStore } from '@/features/vora-studio/store/editorStore';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function StudioToolSheet() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const toolSheetOpen = useStudioEditorStore((s) => s.toolSheetOpen);
  const activeTool = useStudioEditorStore((s) => s.activeTool);
  const closeToolSheet = useStudioEditorStore((s) => s.closeToolSheet);

  const toolMeta = STUDIO_TOOLS.find((t) => t.id === activeTool);

  if (activeTool === 'text') {
    return null;
  }

  return (
    <Modal visible={toolSheetOpen} animationType={resolveModalAnimationType('slide')} transparent onRequestClose={closeToolSheet}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={closeToolSheet} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              paddingBottom: insets.bottom + spacing.sm,
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitle}>
              <Ionicons
                name={(toolMeta?.icon ?? 'options-outline') as keyof typeof Ionicons.glyphMap}
                size={18}
                color={colors.primary}
              />
              <Text variant="label">{toolMeta?.label ?? 'Araç'}</Text>
            </View>
            <Pressable onPress={closeToolSheet} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {toolMeta?.hint ? (
            <View style={[styles.hintBox, { backgroundColor: `${colors.primary}12` }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary, flex: 1 }}>
                {toolMeta.hint}
              </Text>
            </View>
          ) : null}

          <View style={styles.panelBody}>
            <StudioToolPanel />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '52%',
    paddingHorizontal: spacing.md,
  },
  handleWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  handle: { width: 36, height: 4, borderRadius: 2 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sheetTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  panelBody: { flexGrow: 0 },
});
