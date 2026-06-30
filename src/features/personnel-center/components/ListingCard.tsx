import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { ListingApplicationStatsRow } from '@/features/personnel-center/components/ListingApplicationStatsRow';
import { PersonnelActionRow, type PersonnelAction } from '@/features/personnel-center/components/PersonnelActionRow';
import { PersonnelApplySheet } from '@/features/personnel-center/components/PersonnelApplySheet';
import { jobTypeLabel } from '@/features/personnel-center/constants';
import { usePersonnelApply } from '@/features/personnel-center/hooks/usePersonnelApply';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { PERSONNEL_FEATURE } from '@/features/personnel-center/featureFlags';
import {
  callListingPhone,
  messageListingOwner,
  openListingDetail,
} from '@/features/personnel-center/services/personnelActions';
import { EMPTY_LISTING_APPLICATION_STATS } from '@/features/personnel-center/services/listingApplicationStats';
import type { PersonnelListing } from '@/features/personnel-center/types';
import { formatDistance } from '@/features/map/utils/geo';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type ListingCardProps = {
  listing: PersonnelListing;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  showApply?: boolean;
};

export function ListingCard({
  listing,
  isFavorite,
  onToggleFavorite,
  showApply = true,
}: ListingCardProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { applyTarget, openApplySheet, closeApplySheet, submitApplication } = usePersonnelApply(user?.id);
  const showCardMessage = useFeatureVisible(PERSONNEL_FEATURE.cardMessage);
  const showCardCall = useFeatureVisible(PERSONNEL_FEATURE.cardCall);
  const showCardApply = useFeatureVisible(PERSONNEL_FEATURE.cardApply);
  const isOwnListing = user?.id === listing.ownerId;
  const applicationStats = listing.applicationStats ?? EMPTY_LISTING_APPLICATION_STATS;

  const actions = useMemo((): PersonnelAction[] => {
    const items: PersonnelAction[] = [
      {
        id: 'detail',
        label: 'Detay',
        icon: 'document-text-outline',
        onPress: () => openListingDetail(listing.type, listing.id),
      },
    ];

    if (!isOwnListing && listing.ownerId && user && showCardMessage) {
      items.push({
        id: 'message',
        label: 'Mesaj',
        icon: 'chatbubble-outline',
        onPress: async () => {
          if (!(await requireAuth('Mesaj'))) return;
          void messageListingOwner(listing.type, listing.id, listing.ownerId, user.id);
        },
      });
    } else if (!isOwnListing && listing.ownerId && showCardMessage) {
      items.push({
        id: 'message',
        label: 'Mesaj',
        icon: 'chatbubble-outline',
        onPress: async () => {
          await requireAuth('Mesaj');
        },
      });
    }

    if (listing.phone && showCardCall) {
      items.push({
        id: 'call',
        label: 'Ara',
        icon: 'call-outline',
        onPress: () => callListingPhone(listing.phone),
      });
    }

    if (showApply && showCardApply && !isOwnListing) {
      items.push({
        id: 'apply',
        label: 'Başvur',
        icon: 'paper-plane-outline',
        variant: 'primary',
        onPress: async () => {
          if (!(await requireAuth('Başvuru'))) return;
          openApplySheet(listing.type, listing.id, listing.title);
        },
      });
    }

    return items;
  }, [isOwnListing, listing, openApplySheet, requireAuth, showApply, showCardApply, showCardCall, showCardMessage, user]);

  return (
    <>
      <GlassCard
        style={[
          styles.card,
          {
            borderLeftWidth: 3,
            borderLeftColor: listing.isUrgent
              ? colors.danger
              : listing.type === 'job'
                ? colors.primary
                : colors.accent,
          },
        ]}
      >
        <Pressable onPress={() => openListingDetail(listing.type, listing.id)}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              {listing.isUrgent ? (
                <View style={[styles.urgentBadge, { backgroundColor: `${colors.danger}22` }]}>
                  <Ionicons name="flash" size={12} color={colors.danger} />
                  <Text variant="caption" style={{ color: colors.danger }}>
                    Acil
                  </Text>
                </View>
              ) : null}
              <Text variant="label" numberOfLines={2} style={styles.title}>
                {listing.title}
              </Text>
            </View>
            {onToggleFavorite ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  onToggleFavorite();
                }}
                hitSlop={8}
              >
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavorite ? colors.danger : colors.textMuted}
                />
              </Pressable>
            ) : null}
          </View>

          {listing.businessName ? (
            <Text secondary variant="caption">
              {listing.businessName}
            </Text>
          ) : null}

          {listing.description ? (
            <Text secondary variant="caption" numberOfLines={2}>
              {listing.description}
            </Text>
          ) : null}

          <View style={styles.meta}>
            <MetaChip icon="briefcase-outline" label={jobTypeLabel(listing.jobType)} colors={colors} />
            {listing.salaryRange ? (
              <MetaChip icon="cash-outline" label={listing.salaryRange} colors={colors} />
            ) : null}
            {listing.housingProvided ? (
              <MetaChip icon="bed-outline" label="Konaklama" colors={colors} />
            ) : null}
            {listing.mealProvided ? (
              <MetaChip icon="restaurant-outline" label="Yemek" colors={colors} />
            ) : null}
          </View>

          <ListingApplicationStatsRow stats={applicationStats} compact />

          <View style={styles.footer}>
            <Text secondary variant="caption">
              {[listing.district, listing.locationLabel].filter(Boolean).join(' · ') || 'Konum belirtilmedi'}
            </Text>
            {listing.distanceKm != null ? (
              <Text variant="caption" style={{ color: colors.primary }}>
                {formatDistance(listing.distanceKm)}
              </Text>
            ) : null}
          </View>
        </Pressable>

        <PersonnelActionRow actions={actions} />
      </GlassCard>

      <PersonnelApplySheet
        visible={!!applyTarget}
        listingTitle={applyTarget?.listingTitle ?? listing.title}
        userId={user?.id ?? null}
        onClose={closeApplySheet}
        onSubmit={submitApplication}
      />
    </>
  );
}

function MetaChip({
  icon,
  label,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: { border: string; textSecondary: string };
}) {
  return (
    <View style={[styles.chip, { borderColor: colors.border }]}>
      <Ionicons name={icon} size={12} color={colors.textSecondary} />
      <Text variant="caption" secondary>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  titleRow: { flex: 1, gap: spacing.xs },
  title: { flex: 1 },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
