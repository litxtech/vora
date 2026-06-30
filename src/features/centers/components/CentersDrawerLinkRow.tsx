import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { InstantPressable } from '@/components/ui/InstantPressable';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type CentersDrawerLinkRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href: Href;
  onNavigate?: () => void;
  badge?: number;
  accentIcon?: boolean;
};

export function CentersDrawerLinkRow({
  icon,
  label,
  href,
  onNavigate,
  badge,
  accentIcon = false,
}: CentersDrawerLinkRowProps) {
  const { colors } = useTheme();
  const iconColor = accentIcon ? colors.primary : colors.text;

  return (
    <InstantPressable
      onPress={() => {
        router.push(href);
        onNavigate?.();
      }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: `${colors.text}0A` }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color={iconColor} style={styles.icon} />
      <Text variant="body" style={[styles.label, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      {badge != null && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text variant="caption" style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
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
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    flexShrink: 0,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
});
