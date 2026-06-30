import { Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminMarketplaceStatusBadge } from '@/features/admin/components/marketplace/AdminMarketplaceStatusBadge';
import {
  categoryColor,
  categoryIcon,
  categoryLabel,
  formatMarketplaceDate,
  formatMarketplacePrice,
  LISTING_STATUS_LABELS,
} from '@/features/marketplace/constants';
import type { AdminMarketplaceListingRow } from '@/features/marketplace/services/adminMarketplace';
import type { MarketplaceCategory, MarketplaceListingStatus } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminMarketplaceListingCardProps = {
  listing: AdminMarketplaceListingRow;
  onHide: () => void;
  hideLoading?: boolean;
};

export function AdminMarketplaceListingCard({ listing, onHide, hideLoading = false }: AdminMarketplaceListingCardProps) {
  const { colors } = useTheme();
  const catColor = categoryColor(listing.category);
  const statusLabel = LISTING_STATUS_LABELS[listing.status as MarketplaceListingStatus] ?? listing.status;
  const isHidden = listing.content_status === 'hidden';
  const imageUri = listing.cover_url;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: `${catColor}22` }]}>
            <Ionicons name={categoryIcon(listing.category) as keyof typeof Ionicons.glyphMap} size={22} color={catColor} />
          </View>
        )}
        <View style={styles.headerText}>
          <Text variant="label" numberOfLines={2}>
            {listing.title}
          </Text>
          <Text secondary variant="caption">
            {categoryLabel(listing.category as MarketplaceCategory)} · {formatMarketplaceDate(listing.created_at)}
          </Text>
        </View>
      </View>

      <View style={styles.badges}>
        <AdminMarketplaceStatusBadge label={statusLabel} tone={listing.status === 'active' ? 'success' : 'default'} />
        {isHidden ? <AdminMarketplaceStatusBadge label="Gizli" tone="danger" /> : null}
        {listing.content_status !== 'published' && listing.content_status !== 'hidden' ? (
          <AdminMarketplaceStatusBadge label={listing.content_status} tone="warning" />
        ) : null}
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Ionicons name="heart-outline" size={14} color={colors.textMuted} />
          <Text variant="caption">{listing.favorite_count} favori</Text>
        </View>
        <Text variant="caption" style={{ fontWeight: '700', color: catColor }}>
          {listing.price != null ? formatMarketplacePrice(listing.price, 'sale') : '—'}
        </Text>
      </View>

      <View style={styles.actions}>
        {!isHidden ? (
          <AdminActionChip
            label="Gizle"
            icon="eye-off-outline"
            tone="danger"
            onPress={onHide}
            loading={hideLoading}
            compact
          />
        ) : null}
        <AdminActionChip
          label="Görüntüle"
          icon="open-outline"
          tone="default"
          onPress={() => router.push(`/detail/marketplace/${listing.id}` as never)}
          compact
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  header: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: '#ddd',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  stats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
