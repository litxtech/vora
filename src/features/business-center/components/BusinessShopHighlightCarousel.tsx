import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { BusinessShopHotelCard } from '@/features/business-center/components/BusinessShopHotelCard';
import { BusinessShopProductCard } from '@/features/business-center/components/BusinessShopProductCard';
import type { BusinessShopSnapshot } from '@/features/business-center/types';
import { spacing } from '@/constants/theme';

type GridItem =
  | { kind: 'product'; id: string; product: BusinessShopSnapshot['products'][number] }
  | { kind: 'hotel'; id: string; hotel: BusinessShopSnapshot['hotels'][number] };

type Props = {
  items: GridItem[];
  accent: string;
  maxItems?: number;
};

export function BusinessShopHighlightCarousel({ items, accent, maxItems = 3 }: Props) {
  const featured = items.slice(0, maxItems);
  if (featured.length < 2) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Ionicons name="sparkles-outline" size={15} color={accent} />
        <Text variant="label" style={{ color: accent, fontWeight: '800' }}>
          Öne çıkanlar
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {featured.map((item) => (
          <View key={item.id} style={styles.card}>
            {item.kind === 'product' ? (
              <BusinessShopProductCard product={item.product} accent={accent} compact />
            ) : (
              <BusinessShopHotelCard hotel={item.hotel} accent={accent} compact />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const CARD_WIDTH = 200;

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  scroll: { gap: spacing.sm, paddingRight: spacing.lg },
  card: { width: CARD_WIDTH },
});
