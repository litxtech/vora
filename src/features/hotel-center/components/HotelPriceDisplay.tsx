import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  HOTEL_ACCENT,
  discountedPrice,
  formatHotelPrice,
  hotelListPriceDisplay,
} from '@/features/hotel-center/constants';
import { radius, spacing } from '@/constants/theme';

type Props = {
  pricePerNight: number;
  listPricePerNight?: number | null;
  studentDiscountPct?: number;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
};

export function HotelPriceDisplay({
  pricePerNight,
  listPricePerNight,
  studentDiscountPct = 0,
  size = 'md',
  showBadge = true,
}: Props) {
  const hasStudentDiscount = studentDiscountPct > 0;
  const listPrice = hotelListPriceDisplay(listPricePerNight, pricePerNight);
  const voraPrice = pricePerNight;
  const finalPrice = hasStudentDiscount ? discountedPrice(voraPrice, studentDiscountPct) : voraPrice;
  const priceVariant = size === 'lg' ? 'h3' : size === 'sm' ? 'caption' : 'label';

  return (
    <View style={styles.wrap}>
      {listPrice != null ? (
        <Text variant="caption" style={styles.oldPrice}>
          {formatHotelPrice(listPrice)}/gece
        </Text>
      ) : null}

      <View style={styles.row}>
        {showBadge ? (
          <View style={styles.voraBadge}>
            <Ionicons name="sparkles" size={10} color="#fff" />
            <Text variant="caption" style={styles.voraBadgeText}>
              Vora özel fiyat
            </Text>
          </View>
        ) : null}
        {hasStudentDiscount ? (
          <>
            <Text variant="caption" style={styles.oldPrice}>
              {formatHotelPrice(voraPrice)}
            </Text>
            <Text variant={priceVariant} style={{ color: HOTEL_ACCENT }}>
              {formatHotelPrice(finalPrice)}
            </Text>
          </>
        ) : (
          <Text variant={priceVariant} style={{ color: HOTEL_ACCENT }}>
            {formatHotelPrice(voraPrice)}
          </Text>
        )}
        <Text secondary variant="caption">
          /gece
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 },
  oldPrice: { textDecorationLine: 'line-through', opacity: 0.5, fontSize: 11 },
  voraBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: HOTEL_ACCENT,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginRight: 2,
  },
  voraBadgeText: { color: '#fff', fontWeight: '700', fontSize: 10 },
});
