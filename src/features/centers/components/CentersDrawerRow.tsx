import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InstantPressable } from '@/components/ui/InstantPressable';
import { Text } from '@/components/ui/Text';
import { navigateToCenter } from '@/features/centers/services/navigation';
import type { CenterDef } from '@/features/centers/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type CentersDrawerRowProps = {
  center: CenterDef;
  onNavigate?: () => void;
};

export function CentersDrawerRow({ center, onNavigate }: CentersDrawerRowProps) {
  const { colors } = useTheme();

  return (
    <InstantPressable
      onPress={() => {
        navigateToCenter(center.route);
        onNavigate?.();
      }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: `${colors.text}0A` }]}
      accessibilityRole="button"
      accessibilityLabel={center.title}
    >
      <Ionicons
        name={center.icon as keyof typeof Ionicons.glyphMap}
        size={22}
        color={colors.text}
        style={styles.icon}
      />
      <Text variant="body" style={[styles.label, { color: colors.text }]} numberOfLines={1}>
        {center.title}
      </Text>
    </InstantPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderRadius: 8,
  },
  icon: {
    width: 24,
    textAlign: 'center',
    flexShrink: 0,
  },
  label: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
});
