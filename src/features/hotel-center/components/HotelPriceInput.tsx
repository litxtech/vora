import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import {
  HOTEL_ACCENT,
  HOTEL_GRADIENT,
  discountedPrice,
  formatHotelPrice,
  hotelListPriceDisplay,
} from '@/features/hotel-center/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  voraPrice: string;
  onVoraPriceChange: (value: string) => void;
  listPrice: string;
  onListPriceChange: (value: string) => void;
  showListPrice: boolean;
  onToggleListPrice: (enabled: boolean) => void;
  studentDiscountPct?: number;
};

export function HotelPriceInput({
  voraPrice,
  onVoraPriceChange,
  listPrice,
  onListPriceChange,
  showListPrice,
  onToggleListPrice,
  studentDiscountPct = 0,
}: Props) {
  const { colors } = useTheme();
  const voraPriceNum = parseInt(voraPrice.replace(/\D/g, ''), 10) || 0;
  const listPriceNum = parseInt(listPrice.replace(/\D/g, ''), 10) || 0;
  const effectiveListPrice = hotelListPriceDisplay(
    showListPrice ? listPriceNum : null,
    voraPriceNum,
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.modeRow}>
        <View style={styles.modeChipWrap}>
          <LinearGradient
            colors={[HOTEL_GRADIENT[0], HOTEL_GRADIENT[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modeChipActive}
          >
            <Ionicons name="sparkles" size={12} color="#fff" />
            <Text variant="caption" style={styles.modeChipActiveText}>
              Vora özel fiyat
            </Text>
          </LinearGradient>
        </View>
        <Pressable onPress={() => onToggleListPrice(!showListPrice)}>
          <Text
            variant="caption"
            style={[
              styles.modeChip,
              {
                color: showListPrice ? HOTEL_ACCENT : colors.textSecondary,
                borderColor: showListPrice ? `${HOTEL_ACCENT}55` : colors.border,
                backgroundColor: showListPrice ? `${HOTEL_ACCENT}10` : 'transparent',
              },
            ]}
          >
            Liste fiyatı ekle
          </Text>
        </Pressable>
      </View>

      <View style={[styles.priceBox, { borderColor: `${HOTEL_ACCENT}44`, backgroundColor: `${HOTEL_ACCENT}08` }]}>
        <View style={styles.priceLabelRow}>
          <Ionicons name="sparkles" size={14} color={HOTEL_ACCENT} />
          <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '700' }}>
            Vora özel fiyat / gece
          </Text>
        </View>
        <View style={styles.priceInputRow}>
          <Text variant="h2" style={{ color: HOTEL_ACCENT, fontWeight: '300' }}>
            ₺
          </Text>
          <TextInput
            value={voraPrice}
            onChangeText={onVoraPriceChange}
            keyboardType="number-pad"
            placeholder="450"
            placeholderTextColor={colors.textMuted}
            style={[styles.priceInput, { color: colors.text }]}
          />
        </View>
        <Text secondary variant="caption">
          Vora üzerinden rezervasyon yapan misafirlere geçerli gece ücreti
        </Text>
      </View>

      {showListPrice ? (
        <Input
          label="Liste fiyatı (₺)"
          value={listPrice}
          onChangeText={onListPriceChange}
          keyboardType="number-pad"
          placeholder="Örn: 600"
        />
      ) : null}

      {voraPriceNum > 0 ? (
        <View style={[styles.preview, { backgroundColor: `${HOTEL_ACCENT}12`, borderColor: `${HOTEL_ACCENT}33` }]}>
          {effectiveListPrice != null ? (
            <Text variant="caption" style={styles.previewOld}>
              {formatHotelPrice(effectiveListPrice)}/gece
            </Text>
          ) : null}
          <View style={styles.previewRow}>
            <View style={styles.voraBadge}>
              <Ionicons name="sparkles" size={10} color="#fff" />
              <Text variant="caption" style={styles.voraBadgeText}>
                Vora özel fiyat
              </Text>
            </View>
            <Text variant="label" style={{ color: HOTEL_ACCENT }}>
              {formatHotelPrice(voraPriceNum)}/gece
            </Text>
          </View>
          {studentDiscountPct > 0 ? (
            <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '600' }}>
              Öğrenci: {formatHotelPrice(discountedPrice(voraPriceNum, studentDiscountPct))}/gece (-%{studentDiscountPct})
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  modeChipWrap: { borderRadius: radius.full, overflow: 'hidden' },
  modeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    fontWeight: '600',
  },
  modeChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  modeChipActiveText: { color: '#fff', fontWeight: '800' },
  priceBox: {
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  priceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    padding: 0,
  },
  preview: {
    gap: 4,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  previewOld: { textDecorationLine: 'line-through', opacity: 0.55 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  voraBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: HOTEL_ACCENT,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  voraBadgeText: { color: '#fff', fontWeight: '700', fontSize: 10 },
});
