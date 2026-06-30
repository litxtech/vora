import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import {
  categoryColor,
  formatMarketplacePrice,
  listingDetailPath,
  listingSupportsSecureCheckout,
  MARKETPLACE_ACCENT,
} from '@/features/marketplace/constants';
import { prefetchMarketplaceListing } from '@/features/marketplace/services/marketplaceDetailCache';
import type { MarketplaceListing } from '@/features/marketplace/types';
import { formatDistance } from '@/features/map/utils/geo';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  listing: MarketplaceListing;
  onToggleFavorite?: () => void;
};

function sellerInitial(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

export const MarketplaceGridCard = memo(function MarketplaceGridCard({ listing, onToggleFavorite }: Props) {
  const { colors } = useTheme();
  const accent = categoryColor(listing.category);
  const imageUri = listing.coverUrl ?? listing.mediaUrls[0] ?? null;
  const priceLabel = formatMarketplacePrice(listing.price, listing.listingType, listing.currency);
  const isFree = listing.listingType === 'free';
  const isTrade = listing.listingType === 'trade';
  const secure = listingSupportsSecureCheckout(listing);

  return (
    <Pressable
      style={[styles.wrap, { backgroundColor: `${colors.surface}CC`, borderColor: colors.border }]}
      onPressIn={() => prefetchMarketplaceListing(listing.id)}
      onPress={() => router.push(listingDetailPath(listing.id) as never)}
    >
      <View style={[styles.accentStrip, { backgroundColor: accent }]} />

      <View style={styles.imageWrap}>
        {imageUri ? (
          <OptimizedImage uri={imageUri} style={styles.image} tier="grid" contentFit="cover" recyclingKey={listing.id} />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: `${accent}14` }]}>
            <Ionicons name="image-outline" size={28} color={accent} />
          </View>
        )}

        {listing.status === 'reserved' || listing.status === 'sold' || listing.status === 'removed' ? (
          <View style={styles.statusOverlay}>
            <Text variant="caption" style={styles.statusText}>
              {listing.status === 'reserved' ? 'Rezerve' : listing.status === 'sold' ? 'Satıldı' : 'Kaldırıldı'}
            </Text>
          </View>
        ) : null}

        {secure ? (
          <View style={styles.secureBadge}>
            <Ionicons name="shield-checkmark" size={10} color="#fff" />
            <Text variant="caption" style={styles.secureText}>
              Güvenli Al
            </Text>
          </View>
        ) : null}

        <View style={styles.sellerBadge}>
          {listing.authorAvatarUrl ? (
            <OptimizedImage
              uri={listing.authorAvatarUrl}
              style={styles.sellerAvatarImage}
              tier="avatar"
              contentFit="cover"
            />
          ) : (
            <View style={[styles.sellerAvatarFallback, { backgroundColor: `${accent}EE` }]}>
              <Text variant="caption" style={styles.sellerInitial}>
                {sellerInitial(listing.authorName ?? listing.authorUsername)}
              </Text>
            </View>
          )}
          {listing.authorVerified ? (
            <Ionicons name="checkmark-circle" size={11} color="#43A047" style={styles.verifiedIcon} />
          ) : null}
        </View>

        <Pressable
          style={styles.favBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleFavorite?.();
          }}
          hitSlop={8}
        >
          <Ionicons
            name={listing.isFavorite ? 'heart' : 'heart-outline'}
            size={15}
            color={listing.isFavorite ? MARKETPLACE_ACCENT : '#fff'}
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text variant="caption" numberOfLines={2} style={styles.title}>
          {listing.title}
        </Text>

        <Text
          variant="label"
          style={[
            styles.price,
            isFree && { color: colors.success },
            isTrade && { color: MARKETPLACE_ACCENT },
          ]}
        >
          {priceLabel}
          {listing.listingType === 'negotiable' ? (
            <Text secondary variant="caption">
              {' · Pazarlık'}
            </Text>
          ) : null}
        </Text>

        <View style={[styles.locality, { backgroundColor: `${MARKETPLACE_ACCENT}12` }]}>
          <Ionicons name="navigate-outline" size={11} color={MARKETPLACE_ACCENT} />
          <Text variant="caption" numberOfLines={1} style={{ color: MARKETPLACE_ACCENT, flex: 1, fontWeight: '600' }}>
            {listing.district}
            {listing.distanceKm != null ? ` · ${formatDistance(listing.distanceKm)}` : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  accentStrip: { height: 3, width: '100%' },
  imageWrap: {
    position: 'relative',
    aspectRatio: 1,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: { color: '#fff', fontWeight: '800' },
  secureBadge: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(67, 160, 71, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  secureText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  sellerBadge: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    width: 28,
    height: 28,
  },
  sellerAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#ccc',
  },
  sellerAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  sellerInitial: { color: '#fff', fontWeight: '800', fontSize: 11 },
  verifiedIcon: { position: 'absolute', right: -3, bottom: -3, backgroundColor: '#fff', borderRadius: 8 },
  favBtn: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: spacing.sm, gap: 4 },
  title: { fontWeight: '700', lineHeight: 17 },
  price: { fontWeight: '800' },
  locality: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginTop: 2,
  },
});
