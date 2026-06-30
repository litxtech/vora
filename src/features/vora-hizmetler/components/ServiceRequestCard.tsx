import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  formatServiceDate,
  formatServicePrice,
  serviceCategoryColor,
  serviceCategoryIcon,
  serviceCategoryLabel,
  serviceRequestDetailPath,
  serviceUrgencyLabel,
  VORA_HIZMETLER_ACCENT,
} from '@/features/vora-hizmetler/constants';
import type { ServiceRequestListing } from '@/features/vora-hizmetler/types';
import { formatDistance } from '@/features/map/utils/geo';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ServiceRequestCardProps = {
  listing: ServiceRequestListing;
  showOfferButton?: boolean;
  providerId?: string | null;
  isOwnListing?: boolean;
  statusLabel?: string;
};

export function ServiceRequestCard({
  listing,
  showOfferButton = false,
  providerId,
  isOwnListing = false,
  statusLabel,
}: ServiceRequestCardProps) {
  const { colors } = useTheme();
  const categoryColor = serviceCategoryColor(listing.category);
  const thumb = listing.imageUrls[0];

  const openDetail = () => {
    router.push(serviceRequestDetailPath(listing.id) as never);
  };

  const openOffer = () => {
    if (!providerId) return;
    router.push(`/vora-hizmetler/submit-offer/${listing.id}` as never);
  };

  return (
    <View style={styles.wrap}>
      <Pressable onPress={openDetail} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
        <GlassCard style={styles.card} padded={false}>
          <View style={[styles.cardTint, { backgroundColor: `${categoryColor}12` }]} />
        <View style={[styles.stripe, { backgroundColor: categoryColor }]} />

        <View style={styles.row}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} />
          ) : (
            <View style={[styles.iconThumb, { backgroundColor: `${categoryColor}20` }]}>
              <Ionicons
                name={serviceCategoryIcon(listing.category) as keyof typeof Ionicons.glyphMap}
                size={24}
                color={categoryColor}
              />
            </View>
          )}

          <View style={styles.content}>
            <View style={styles.topRow}>
              <View style={[styles.categoryPill, { backgroundColor: `${categoryColor}18`, borderColor: `${categoryColor}35` }]}>
                <Ionicons
                  name={serviceCategoryIcon(listing.category) as keyof typeof Ionicons.glyphMap}
                  size={11}
                  color={categoryColor}
                />
                <Text variant="caption" style={{ color: categoryColor, fontWeight: '700', fontSize: 10 }}>
                  {serviceCategoryLabel(listing.category)}
                </Text>
              </View>
              {listing.isEmergency ? (
                <View style={styles.urgentPill}>
                  <Ionicons name="flash" size={10} color="#fff" />
                  <Text variant="caption" style={styles.urgentText}>
                    Acil
                  </Text>
                </View>
              ) : null}
              {statusLabel ? (
                <View style={[styles.statusPill, { backgroundColor: `${colors.textSecondary}12` }]}>
                  <Text variant="caption" style={{ fontWeight: '700', fontSize: 10 }}>
                    {statusLabel}
                  </Text>
                </View>
              ) : null}
              {isOwnListing && listing.status === 'pending_offers' ? (
                <View style={[styles.statusPill, { backgroundColor: `${VORA_HIZMETLER_ACCENT}14` }]}>
                  <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT, fontWeight: '700', fontSize: 10 }}>
                    Aktif
                  </Text>
                </View>
              ) : null}
            </View>

            <Text variant="label" numberOfLines={2} style={styles.title}>
              {listing.title}
            </Text>

            <Text secondary variant="caption" numberOfLines={2} style={styles.desc}>
              {listing.description}
            </Text>

            <View style={styles.metaRow}>
              <MetaChip icon="time-outline" label={serviceUrgencyLabel(listing.urgency)} />
              {listing.city ? <MetaChip icon="location-outline" label={listing.city} /> : null}
              {listing.distanceKm != null ? (
                <MetaChip icon="navigate-outline" label={formatDistance(listing.distanceKm)} />
              ) : null}
            </View>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <View style={styles.offerBadge}>
                <Ionicons name="document-text-outline" size={12} color={VORA_HIZMETLER_ACCENT} />
                <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT, fontWeight: '700' }}>
                  {listing.offerCount} teklif
                </Text>
              </View>
              {(listing.budgetMin != null || listing.budgetMax != null) && (
                <Text variant="caption" style={{ color: colors.text, fontWeight: '700' }}>
                  {listing.budgetMin != null && listing.budgetMax != null
                    ? `${formatServicePrice(listing.budgetMin)} – ${formatServicePrice(listing.budgetMax)}`
                    : listing.budgetMax != null
                      ? `Max ${formatServicePrice(listing.budgetMax)}`
                      : `Min ${formatServicePrice(listing.budgetMin!)}`}
                </Text>
              )}
              <Text secondary variant="caption" style={styles.date}>
                {formatServiceDate(listing.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </GlassCard>
      </Pressable>

      {showOfferButton && listing.status === 'pending_offers' ? (
        <Pressable onPress={openOffer} style={[styles.offerBtn, { backgroundColor: '#10B981' }]}>
          <Ionicons name="send-outline" size={16} color="#fff" />
          <Text variant="label" style={{ color: '#fff' }}>
            Teklif Ver
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MetaChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaChip}>
      <Ionicons name={icon} size={11} color={colors.textMuted} />
      <Text secondary variant="caption" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  card: {
    overflow: 'hidden',
  },
  cardTint: {
    ...StyleSheet.absoluteFillObject,
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  row: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingLeft: spacing.md + 4,
    gap: spacing.md,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: radius.lg,
  },
  iconThumb: {
    width: 76,
    height: 76,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  urgentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  urgentText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  title: {
    marginTop: 2,
  },
  desc: {
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 2,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    marginLeft: 'auto',
  },
  offerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
  },
});
