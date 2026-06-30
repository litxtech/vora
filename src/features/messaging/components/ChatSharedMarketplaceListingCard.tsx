import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Text } from '@/components/ui/Text';
import { MARKETPLACE_ACCENT, MARKETPLACE_GRADIENT } from '@/features/marketplace/constants';
import { navigateToSharedCard } from '@/features/messaging/services/sharedCardNavigation';
import { CHAT_MARKETPLACE_SHARE_WIDTH } from '@/features/messaging/constants';
import { radius, spacing } from '@/constants/theme';
import type { ChatMessage } from '@/features/messaging/types';

type Props = {
  message: ChatMessage;
  textColor: string;
  metaColor: string;
  viewerId: string | null;
};

export function ChatSharedMarketplaceListingCard({ message, textColor, metaColor, viewerId }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(CHAT_MARKETPLACE_SHARE_WIDTH, screenWidth * 0.76);
  const imageUrl = message.metadata?.imageUrl ?? null;
  const title = message.metadata?.title?.trim() || 'İlan';
  const priceLabel = message.metadata?.preview?.trim() || null;

  const openDetail = () => navigateToSharedCard(message, viewerId);

  return (
    <Pressable
      onPress={openDetail}
      accessibilityRole="button"
      accessibilityLabel={`${title} ilanını aç`}
      style={({ pressed }) => [
        styles.wrap,
        { width: cardWidth, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={[styles.card, { borderColor: `${MARKETPLACE_ACCENT}44` }]}>
        <LinearGradient
          colors={[MARKETPLACE_GRADIENT[0], MARKETPLACE_GRADIENT[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentStrip}
        />

        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="storefront" size={11} color="#fff" />
            <Text variant="caption" style={styles.brandText}>
              Yerel Pazar
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={metaColor} />
        </View>

        <View style={[styles.imageWrap, { width: cardWidth - 2, height: cardWidth - 2 }]}>
          {imageUrl ? (
            <OptimizedImage uri={imageUrl} style={styles.image} tier="grid" contentFit="cover" />
          ) : (
            <LinearGradient
              colors={[`${MARKETPLACE_ACCENT}33`, `${MARKETPLACE_ACCENT}12`]}
              style={styles.imagePlaceholder}
            >
              <Ionicons name="image-outline" size={36} color={MARKETPLACE_ACCENT} />
            </LinearGradient>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.72)']}
            style={styles.imageFade}
            pointerEvents="none"
          />

          {priceLabel ? (
            <View style={styles.pricePill} pointerEvents="none">
              <Text variant="label" style={styles.priceText}>
                {priceLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.ctaRow}>
            <Text variant="caption" style={{ color: MARKETPLACE_ACCENT, fontWeight: '700' }}>
              İlana git
            </Text>
            <Ionicons name="arrow-forward" size={12} color={MARKETPLACE_ACCENT} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 2,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    backgroundColor: 'rgba(10, 12, 16, 0.35)',
  },
  accentStrip: {
    height: 3,
    width: '100%',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${MARKETPLACE_ACCENT}CC`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  brandText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  imageWrap: {
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: '#111820',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
  },
  pricePill: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  priceText: {
    color: '#fff',
    fontWeight: '800',
  },
  footer: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
