import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { HOTEL_ACCENT } from '@/features/hotel-center/constants';
import type { HotelReviewEligibility } from '@/features/hotel-center/services/hotelReviewEligibility';
import { reviewEligibilityMessage } from '@/features/hotel-center/services/hotelReviewEligibility';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  eligibility: HotelReviewEligibility;
  onPress: () => void;
};

export function HotelReviewAction({ eligibility, onPress }: Props) {
  const { colors } = useTheme();
  const canAct = eligibility.eligible || eligibility.hasReview;
  const label = eligibility.hasReview ? 'Düzenle' : 'Değerlendir';
  const hint = eligibility.hasReview
    ? 'Değerlendirmenizi güncelleyin'
    : reviewEligibilityMessage(eligibility);

  if (!hint && !canAct) return null;

  if (!canAct) {
    return (
      <View style={[styles.locked, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
        <Text secondary variant="caption" style={styles.lockedText}>
          {hint}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: `${HOTEL_ACCENT}12`, borderColor: `${HOTEL_ACCENT}44`, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: HOTEL_ACCENT }]}>
        <Ionicons name={eligibility.hasReview ? 'create-outline' : 'star'} size={14} color="#fff" />
      </View>
      <View style={styles.copy}>
        <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '700' }}>
          {label}
        </Text>
        <Text secondary variant="caption" numberOfLines={1}>
          {hint}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={HOTEL_ACCENT} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 1 },
  locked: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  lockedText: { flex: 1, lineHeight: 16 },
});
