import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { BUSINESS_VERIFIED_COLOR } from '@/features/profile/services/businessIdentity';
import { radius, spacing } from '@/constants/theme';

type Props = {
  size?: number;
  showLabel?: boolean;
};

export function BusinessVerifiedTick({ size = 20, showLabel = false }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="checkmark-circle" size={size} color={BUSINESS_VERIFIED_COLOR} />
      {showLabel ? (
        <View style={styles.labelPill}>
          <Ionicons name="storefront" size={10} color={BUSINESS_VERIFIED_COLOR} />
          <Text variant="caption" style={styles.labelText}>
            İşletme
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,179,0,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,179,0,0.35)',
  },
  labelText: { color: BUSINESS_VERIFIED_COLOR, fontWeight: '800', fontSize: 10 },
});
