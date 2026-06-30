import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  formatMarketplaceDate,
  formatMarketplacePrice,
  LISTING_STATUS_LABELS,
  listingDetailPath,
  listingEditPath,
  MARKETPLACE_ACCENT,
} from '@/features/marketplace/constants';
import { setOwnerListingStatus } from '@/features/marketplace/services/listingData';
import type { MarketplaceListing } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const STATUS_COLORS: Record<string, string> = {
  active: '#43A047',
  reserved: '#FFB300',
  sold: '#78909C',
  removed: '#EF5350',
  archived: '#607D8B',
};

type Props = {
  listing: MarketplaceListing;
  onChanged?: () => void;
};

export function MyListingRow({ listing, onChanged }: Props) {
  const { colors } = useTheme();
  const statusColor = STATUS_COLORS[listing.status] ?? colors.textMuted;
  const canEdit = ['active', 'reserved', 'sold'].includes(listing.status);

  const handleMore = () => {
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];

    if (canEdit) {
      options.push({
        text: 'Düzenle',
        onPress: () => router.push(listingEditPath(listing.id) as never),
      });
    }
    if (listing.status === 'active') {
      options.push({
        text: 'Satıldı işaretle',
        onPress: () => handleStatusChange('sold', 'İlan satıldı olarak işaretlensin mi?'),
      });
    }
    if (listing.status === 'reserved' || listing.status === 'sold') {
      options.push({
        text: 'Satılığa çıkar',
        onPress: () => handleStatusChange('active'),
      });
    }
    if (listing.status === 'removed') {
      options.push({
        text: 'Yeniden yayınla',
        onPress: () => handleStatusChange('active', 'İlan tekrar yayınlansın mı?'),
      });
    }
    if (listing.status !== 'removed') {
      options.push({
        text: 'İlanı kaldır',
        style: 'destructive',
        onPress: () => handleStatusChange('removed', 'İlan kaldırılsın mı?'),
      });
    }
    options.push({ text: 'Vazgeç', style: 'cancel' });
    Alert.alert(listing.title, 'İlan işlemi seçin', options);
  };

  const handleStatusChange = (status: MarketplaceListing['status'], confirm?: string) => {
    const run = async () => {
      const result = await setOwnerListingStatus(listing.id, status);
      if (result.error) Alert.alert('Hata', result.error);
      else onChanged?.();
    };
    if (confirm) {
      Alert.alert('Onay', confirm, [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet', onPress: run },
      ]);
    } else {
      run();
    }
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <Pressable onPress={() => router.push(listingDetailPath(listing.id) as never)} style={styles.thumbPress}>
          {listing.coverUrl ? (
            <Image source={{ uri: listing.coverUrl }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: `${MARKETPLACE_ACCENT}18` }]}>
              <Ionicons name="image-outline" size={20} color={MARKETPLACE_ACCENT} />
            </View>
          )}
        </Pressable>
        <Pressable onPress={() => router.push(listingDetailPath(listing.id) as never)} style={styles.meta}>
          <Text variant="label" numberOfLines={2}>
            {listing.title}
          </Text>
          <Text variant="caption" style={{ color: MARKETPLACE_ACCENT, fontWeight: '700' }}>
            {formatMarketplacePrice(listing.price, listing.listingType, listing.currency)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text variant="caption" style={{ color: statusColor, fontWeight: '700' }}>
              {LISTING_STATUS_LABELS[listing.status]}
            </Text>
          </View>
          <Text secondary variant="caption">
            {formatMarketplaceDate(listing.updatedAt)} · {listing.viewCount} görüntülenme · {listing.favoriteCount}{' '}
            favori
          </Text>
        </Pressable>
        <View style={styles.actions}>
          {canEdit ? (
            <Pressable
              hitSlop={8}
              onPress={() => router.push(listingEditPath(listing.id) as never)}
              style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: `${MARKETPLACE_ACCENT}12` }]}
            >
              <Ionicons name="create-outline" size={16} color={MARKETPLACE_ACCENT} />
            </Pressable>
          ) : null}
          <Pressable
            hitSlop={8}
            onPress={handleMore}
            style={[styles.actionBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  thumbPress: { borderRadius: radius.md, overflow: 'hidden' },
  thumb: { width: 76, height: 76, borderRadius: radius.md },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, gap: 4 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  actions: { gap: spacing.xs },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
