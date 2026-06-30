import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { formatMarketplacePrice, listingDetailPath, MARKETPLACE_ACCENT } from '@/features/marketplace/constants';
import type { MarketplaceListing } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  variants: MarketplaceListing[];
};

export function MarketplaceVariantsStrip({ variants }: Props) {
  const { colors } = useTheme();

  if (!variants.length) return null;

  return (
    <GlassCard style={styles.card}>
      <Text variant="label" style={styles.title}>
        Diğer varyantlar
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {variants.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(listingDetailPath(item.id) as never)}
            style={({ pressed }) => [
              styles.item,
              { backgroundColor: `${colors.surface}CC`, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {item.coverUrl ? (
              <Image source={{ uri: item.coverUrl }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: `${MARKETPLACE_ACCENT}18` }]} />
            )}
            <Text variant="caption" numberOfLines={2} style={styles.itemTitle}>
              {item.title}
            </Text>
            <Text variant="caption" style={{ color: MARKETPLACE_ACCENT, fontWeight: '700' }}>
              {formatMarketplacePrice(item.price, item.listingType, item.currency)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md },
  title: { marginBottom: 2 },
  row: { gap: spacing.sm, paddingRight: spacing.sm },
  item: {
    width: 112,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xs,
    gap: 4,
  },
  thumb: { width: '100%', height: 72, borderRadius: radius.md },
  thumbPlaceholder: {},
  itemTitle: { minHeight: 28 },
});
