import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { INCIDENT_ACCENT } from '@/features/incidents/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  count?: number;
  accent?: string;
};

export function IncidentSectionHeader({
  icon,
  title,
  subtitle,
  count,
  accent = INCIDENT_ACCENT,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}16` }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <View style={styles.copy}>
        <Text variant="label">{title}</Text>
        {subtitle ? (
          <Text variant="caption" secondary>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {count != null && count > 0 ? (
        <View style={[styles.countBadge, { backgroundColor: `${accent}18`, borderColor: `${accent}33` }]}>
          <Text variant="caption" style={{ color: accent, fontWeight: '800' }}>
            {count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
});
