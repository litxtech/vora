import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { INSIGHTS_ACCENT } from '@/features/insights/constants';
import { radius, spacing } from '@/constants/theme';

type ProfileInsightsPillProps = {
  onPress: () => void;
};

export function ProfileInsightsPill({ onPress }: ProfileInsightsPillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: `${INSIGHTS_ACCENT}14`,
          borderColor: `${INSIGHTS_ACCENT}55`,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name="analytics-outline" size={14} color={INSIGHTS_ACCENT} />
      <Text variant="caption" style={[styles.label, { color: INSIGHTS_ACCENT }]}>
        İç Görüler
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 12, fontWeight: '700' },
});
