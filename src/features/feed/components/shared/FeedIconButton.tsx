import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InstantPressable } from '@/components/ui/InstantPressable';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type FeedIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accent?: boolean;
  badge?: number;
  label?: string;
  compact?: boolean;
};

export function FeedIconButton({
  icon,
  onPress,
  accent = false,
  badge,
  label,
  compact = false,
}: FeedIconButtonProps) {
  const { colors } = useTheme();
  const dimension = compact ? 34 : 40;

  return (
    <InstantPressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        label ? styles.wrapLabeled : null,
        pressed && { opacity: 0.8 },
      ]}
    >
      <View
        style={[
          styles.btn,
          {
            width: dimension,
            height: dimension,
            backgroundColor: accent ? colors.primary : colors.surfaceElevated,
            borderColor: accent ? colors.primary : colors.border,
          },
        ]}
      >
        <Ionicons name={icon} size={compact ? 17 : 20} color={accent ? '#fff' : colors.text} />
        {badge != null && badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.danger }]}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
      </View>
      {label ? (
        <Text variant="caption" secondary numberOfLines={1} style={styles.label}>
          {label}
        </Text>
      ) : null}
    </InstantPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapLabeled: {
    flex: 1,
    gap: spacing.xs,
  },
  btn: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 15,
    height: 15,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
  },
});
