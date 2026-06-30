import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { LISTING_TYPE_OPTIONS, MARKETPLACE_ACCENT, MARKETPLACE_GRADIENT } from '@/features/marketplace/constants';
import type { MarketplaceListingType } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  listingType: MarketplaceListingType;
  price: string;
  onPriceChange: (value: string) => void;
  onListingTypeChange: (value: MarketplaceListingType) => void;
};

export function MarketplaceModernPriceInput({
  listingType,
  price,
  onPriceChange,
  onListingTypeChange,
}: Props) {
  const { colors } = useTheme();
  const showPrice = listingType !== 'free' && listingType !== 'trade';

  return (
    <View style={styles.wrap}>
      <View style={styles.typeRow}>
        {LISTING_TYPE_OPTIONS.map((option) => {
          const active = listingType === option.value;
          return (
            <View key={option.value} style={styles.typeChipWrap}>
              {active ? (
                <LinearGradient
                  colors={[MARKETPLACE_GRADIENT[0], MARKETPLACE_GRADIENT[1]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.typeChipActive}
                >
                  <Text variant="caption" style={styles.typeChipActiveText}>
                    {option.label}
                  </Text>
                </LinearGradient>
              ) : (
                <Pressable onPress={() => onListingTypeChange(option.value)}>
                  <Text
                    variant="caption"
                    style={[styles.typeChip, { color: colors.textSecondary, borderColor: colors.border }]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      {showPrice ? (
        <View style={[styles.priceBox, { borderColor: colors.border, backgroundColor: `${colors.surface}CC` }]}>
          <Text variant="h2" style={{ color: MARKETPLACE_ACCENT, fontWeight: '300' }}>
            ₺
          </Text>
          <TextInput
            value={price}
            onChangeText={onPriceChange}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={[styles.priceInput, { color: colors.text }]}
          />
          <Text secondary variant="caption">
            TRY
          </Text>
        </View>
      ) : (
        <View style={[styles.freeHint, { backgroundColor: `${MARKETPLACE_ACCENT}12` }]}>
          <Ionicons
            name={listingType === 'free' ? 'gift-outline' : 'swap-horizontal-outline'}
            size={16}
            color={MARKETPLACE_ACCENT}
          />
          <Text variant="caption" style={{ color: MARKETPLACE_ACCENT, fontWeight: '600' }}>
            {listingType === 'free' ? 'Ücretsiz ilan — fiyat alanı gerekmez' : 'Takas ilanı — fiyat yerine teklif beklenir'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  typeChipWrap: { borderRadius: radius.full, overflow: 'hidden' },
  typeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  typeChipActive: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  typeChipActiveText: { color: '#fff', fontWeight: '800' },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  priceInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    padding: 0,
  },
  freeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
  },
});
