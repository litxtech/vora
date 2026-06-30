import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  label: string;
  current: number;
  target: number;
  unit?: string;
};

export function ReferralProgressBar({ label, current, target, unit = '' }: Props) {
  const { colors } = useTheme();
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const met = current >= target;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text variant="caption" secondary>
          {label}
        </Text>
        <Text variant="caption" style={{ color: met ? colors.success : colors.textMuted }}>
          {current}
          {unit} / {target}
          {unit}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceElevated }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percent}%`,
              backgroundColor: met ? colors.success : colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 6, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
});
