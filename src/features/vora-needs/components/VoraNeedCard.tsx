import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  formatVoraNeedDate,
  voraNeedCategoryColor,
  voraNeedCategoryIcon,
  voraNeedCategoryLabel,
  voraNeedDetailPath,
  VORA_NEED_VISIBILITY_LABELS,
} from '@/features/vora-needs/constants';
import { prefetchVoraNeedDetail } from '@/features/vora-needs/services/voraNeedDetailCache';
import type { VoraNeedListing } from '@/features/vora-needs/types';
import { formatDistance } from '@/features/map/utils/geo';
import { regionNameById } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type VoraNeedCardProps = {
  listing: VoraNeedListing;
  onToggleFavorite?: (listing: VoraNeedListing) => void;
};

function locationLabel(listing: VoraNeedListing): string {
  return listing.city ?? regionNameById(listing.regionId ?? '') ?? 'Genel';
}

function authorLabel(listing: VoraNeedListing): string {
  if (listing.authorName?.trim()) return listing.authorName.trim();
  if (listing.authorUsername) return `@${listing.authorUsername}`;
  return 'Kullanıcı';
}

export function VoraNeedCard({ listing, onToggleFavorite }: VoraNeedCardProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const categoryColor = voraNeedCategoryColor(listing.category);
  const isUrgent = listing.urgency === 'urgent';

  const metaParts = [
    voraNeedCategoryLabel(listing.category),
    VORA_NEED_VISIBILITY_LABELS[listing.visibility],
    locationLabel(listing),
    formatVoraNeedDate(listing.createdAt),
  ];
  if (listing.distanceKm != null) {
    metaParts.push(formatDistance(listing.distanceKm));
  }

  return (
    <Pressable
      onPressIn={() => prefetchVoraNeedDetail(listing.id, user?.id ?? null)}
      onPress={() => router.push(voraNeedDetailPath(listing.id) as never)}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border, opacity: pressed ? 0.72 : 1 },
      ]}
    >
      {listing.imageUrl ? (
        <Image source={{ uri: listing.imageUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.iconThumb, { backgroundColor: `${categoryColor}16` }]}>
          <Ionicons
            name={voraNeedCategoryIcon(listing.category) as keyof typeof Ionicons.glyphMap}
            size={18}
            color={categoryColor}
          />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: `${categoryColor}18`, borderColor: `${categoryColor}33` }]}>
            {listing.authorAvatar ? (
              <Image source={{ uri: listing.authorAvatar }} style={styles.avatarImage} />
            ) : (
              <Text variant="caption" style={{ color: categoryColor, fontWeight: '700', fontSize: 11 }}>
                {authorLabel(listing).slice(0, 1).toUpperCase()}
              </Text>
            )}
          </View>
          <Text variant="caption" numberOfLines={1} style={styles.authorName}>
            {authorLabel(listing)}
          </Text>
        </View>

        <View style={styles.titleRow}>
          {isUrgent ? (
            <Ionicons name="flash" size={13} color={colors.danger} style={styles.urgentIcon} />
          ) : listing.isFeatured ? (
            <Ionicons name="star" size={12} color="#FFB300" style={styles.urgentIcon} />
          ) : null}
          <Text variant="label" numberOfLines={2} style={styles.title}>
            {listing.title}
          </Text>
        </View>

        <Text secondary variant="caption" numberOfLines={1} style={styles.meta}>
          {metaParts.join(' · ')}
        </Text>
      </View>

      {onToggleFavorite ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleFavorite(listing);
          }}
          hitSlop={8}
          style={styles.favBtn}
        >
          <Ionicons
            name={listing.isFavorited ? 'heart' : 'heart-outline'}
            size={18}
            color={listing.isFavorited ? colors.danger : colors.textMuted}
          />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.chevron} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: '#00000010',
  },
  iconThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  authorName: {
    flex: 1,
    fontWeight: '600',
    lineHeight: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  urgentIcon: {
    marginTop: 2,
  },
  title: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  meta: {
    lineHeight: 16,
  },
  favBtn: {
    padding: 4,
  },
  chevron: {
    marginLeft: 2,
  },
});
