import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { STUDIO_TOOLS } from '@/features/vora-studio/constants';
import { useStudioEditorStore } from '@/features/vora-studio/store/editorStore';
import type { StudioTool } from '@/features/vora-studio/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function StudioToolbar() {
  const { colors } = useTheme();
  const activeTool = useStudioEditorStore((s) => s.activeTool);
  const toolSheetOpen = useStudioEditorStore((s) => s.toolSheetOpen);
  const toggleTool = useStudioEditorStore((s) => s.toggleTool);

  return (
    <View style={styles.grid}>
      {STUDIO_TOOLS.map((tool) => {
        const active = activeTool === tool.id && toolSheetOpen;
        return (
          <Pressable
            key={tool.id}
            style={[
              styles.item,
              {
                backgroundColor: active ? `${colors.primary}22` : `${colors.surface}99`,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
            onPress={() => toggleTool(tool.id as StudioTool)}
          >
            <Ionicons
              name={tool.icon as keyof typeof Ionicons.glyphMap}
              size={19}
              color={active ? colors.primary : colors.textSecondary}
            />
            <Text
              variant="caption"
              numberOfLines={1}
              style={{ color: active ? colors.primary : colors.textSecondary, fontSize: 10 }}
            >
              {tool.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  item: {
    width: '23.5%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 56,
  },
});
