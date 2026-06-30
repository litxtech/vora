import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  LOST_CATEGORY_COLORS,
  formatLostDate,
  formatLostTimeAgo,
  lostCategoryIcon,
  lostCategoryLabel,
  lostDetailPath,
} from '@/features/lost-found/constants';
import type { LostListing } from '@/features/lost-found/types';
import { formatDistance } from '@/features/map/utils/geo';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type LostItemCardProps = {
  listing: LostListing;
};

function LostItemCardComponent({ listing }: LostItemCardProps) {
  const { colors } = useTheme();
  const categoryColor = LOST_CATEGORY_COLORS[listing.category];
  const typeColor = listing.itemType === 'lost' ? colors.danger : colors.success;
  const accentColor = listing.isUrgent
    ? colors.danger
    : listing.status === 'resolved'
      ? colors.success
      : categoryColor;

  return (
    <Pressable
      onPress={() => router.push(lostDetailPath(listing.id) as never)}
      style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.coverWrap}>
          {listing.mediaUrls[0] ? (
            <Image source={{ uri: listing.mediaUrls[0] }} style={styles.cover} />
          ) : (
            <LinearGradient
              colors={[`${categoryColor}44`, `${categoryColor}18`]}
              style={styles.coverPlaceholder}
            >
              <Ionicons
                name={lostCategoryIcon(listing.category) as keyof typeof Ionicons.glyphMap}
                size={40}
                color={categoryColor}
              />
            </LinearGradient>
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.coverOverlay} />

          <View style={styles.coverTop}>
            <View style={[styles.typeBadge, { backgroundColor: `${typeColor}DD` }]}>
              <Ionicons
                name={listing.itemType === 'lost' ? 'help-circle' : 'checkmark-circle'}
                size={11}
                color="#fff"
              />
              <Text variant="caption" style={styles.badgeText}>
                {listing.itemType === 'lost' ? 'Kayıp' : 'Buluntu'}
              </Text>
            </View>
            {listing.isUrgent ? (
              <View style={[styles.urgentBadge, { backgroundColor: colors.danger }]}>
                <Ionicons name="flash" size={11} color="#fff" />
                <Text variant="caption" style={styles.badgeText}>
                  Acil
                </Text>
              </View>
            ) : null}
            {listing.status === 'resolved' ? (
              <View style={[styles.urgentBadge, { backgroundColor: colors.success }]}>
                <Ionicons name="checkmark-circle" size={11} color="#fff" />
                <Text variant="caption" style={styles.badgeText}>
                  Çözüldü
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.coverBottom}>
            <Text variant="label" numberOfLines={2} style={styles.coverTitle}>
              {listing.title}
            </Text>
            <Text variant="caption" style={styles.coverMeta}>
              {formatLostTimeAgo(listing.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {listing.description ? (
            <Text secondary variant="caption" numberOfLines={2}>
              {listing.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={[styles.categoryPill, { backgroundColor: `${categoryColor}14` }]}>
              <Ionicons
                name={lostCategoryIcon(listing.category) as keyof typeof Ionicons.glyphMap}
                size={12}
                color={categoryColor}
              />
              <Text variant="caption" style={{ color: categoryColor, fontWeight: '600' }}>
                {lostCategoryLabel(listing.category)}
              </Text>
            </View>
            {listing.distanceKm != null ? (
              <Text variant="caption" style={{ color: accentColor, fontWeight: '600' }}>
                {formatDistance(listing.distanceKm)}
              </Text>
            ) : null}
          </View>

          {listing.locationName || listing.district ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text secondary variant="caption" numberOfLines={1} style={styles.flex}>
                {[listing.locationName, listing.district].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Text secondary variant="caption">
              {formatLostDate(listing.createdAt)}
            </Text>
            {listing.viewCount > 0 ? (
              <View style={styles.stat}>
                <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
                <Text secondary variant="caption">
                  {listing.viewCount}
                </Text>
              </View>
            ) : null}
          </View>

          {listing.rewardAmount ? (
            <View style={[styles.rewardRow, { backgroundColor: `${colors.warning}16` }]}>
              <Ionicons name="gift-outline" size={14} color={colors.warning} />
              <Text variant="caption" style={{ color: colors.warning, fontWeight: '700' }}>
                Ödül: {listing.rewardAmount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export const LostItemCard = memo(LostItemCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  coverWrap: {
    height: 170,
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  coverTop: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 10,
  },
  coverBottom: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    gap: 2,
  },
  coverTitle: {
    color: '#fff',
    fontWeight: '700',
  },
  coverMeta: {
    color: 'rgba(255,255,255,0.9)',
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flex: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
});
