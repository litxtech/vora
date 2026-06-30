import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  formatServicePrice,
  OFFER_STATUS_LABELS,
  serviceProviderDetailPath,
  VORA_HIZMETLER_ACCENT,
  VORA_HIZMETLER_GRADIENT,
} from '@/features/vora-hizmetler/constants';
import { HizmetStatChip } from '@/features/vora-hizmetler/components/HizmetStatCard';
import type { ServiceOfferListing } from '@/features/vora-hizmetler/types';
import { formatDistance } from '@/features/map/utils/geo';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ServiceOfferCardProps = {
  offer: ServiceOfferListing;
  onAccept?: () => void;
  onReject?: () => void;
  showAccept?: boolean;
  showReject?: boolean;
};

export function ServiceOfferCard({
  offer,
  onAccept,
  onReject,
  showAccept = false,
  showReject = false,
}: ServiceOfferCardProps) {
  const { colors } = useTheme();
  const statusColor =
    offer.status === 'accepted'
      ? '#10B981'
      : offer.status === 'rejected'
        ? colors.textMuted
        : offer.status === 'pending'
          ? VORA_HIZMETLER_ACCENT
          : colors.textSecondary;

  return (
    <GlassCard style={styles.card} padded={false}>
      <LinearGradient colors={[`${VORA_HIZMETLER_ACCENT}10`, 'transparent']} style={styles.headerBg} />

      <Pressable
        onPress={() => router.push(serviceProviderDetailPath(offer.providerId) as never)}
        style={styles.header}
      >
        {offer.providerAvatar ? (
          <Image source={{ uri: offer.providerAvatar }} style={styles.avatar} />
        ) : (
          <LinearGradient colors={[...VORA_HIZMETLER_GRADIENT]} style={[styles.avatar, styles.avatarFallback]}>
            <Text variant="label" style={{ color: '#fff' }}>
              {(offer.providerName ?? 'U')[0]}
            </Text>
          </LinearGradient>
        )}

        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text variant="label" numberOfLines={1}>
              {offer.providerName ?? 'Usta'}
            </Text>
            {offer.providerIsPremium ? (
              <View style={styles.premiumPill}>
                <Ionicons name="star" size={9} color="#fff" />
                <Text variant="caption" style={styles.premiumText}>
                  PREMIUM
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.statsRow}>
            <View style={styles.ratingChip}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text variant="caption" style={{ fontWeight: '800' }}>
                {offer.providerRating.toFixed(1)}
              </Text>
            </View>
            <HizmetStatChip icon="briefcase-outline" label={`${offer.providerJobCount} iş`} color="#0EA5E9" />
            <HizmetStatChip icon="checkmark-circle-outline" label={`%${Math.round(offer.providerCompletionRate)}`} color="#10B981" />
          </View>
        </View>

        <View style={styles.priceCol}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}16`, borderColor: `${statusColor}35` }]}>
            <Text variant="caption" style={{ color: statusColor, fontWeight: '700', fontSize: 10 }}>
              {OFFER_STATUS_LABELS[offer.status]}
            </Text>
          </View>
          <Text variant="caption" secondary>
            Teklif
          </Text>
          <Text variant="label" style={{ color: VORA_HIZMETLER_ACCENT, fontSize: 20, fontWeight: '800' }}>
            {formatServicePrice(offer.price)}
          </Text>
        </View>
      </Pressable>

      <View style={[styles.details, { borderTopColor: colors.border }]}>
        <View style={styles.detailGrid}>
          {offer.estimatedArrival ? (
            <DetailTile icon="time-outline" label="Geliş" value={formatArrival(offer.estimatedArrival)} />
          ) : null}
          {offer.distanceKm != null ? (
            <DetailTile icon="navigate-outline" label="Uzaklık" value={formatDistance(offer.distanceKm)} />
          ) : null}
          {offer.providerResponseMinutes != null ? (
            <DetailTile icon="chatbubble-outline" label="Yanıt" value={`${offer.providerResponseMinutes} dk`} />
          ) : null}
          {offer.warrantyMonths != null ? (
            <DetailTile icon="shield-checkmark-outline" label="Garanti" value={`${offer.warrantyMonths} ay`} />
          ) : null}
        </View>

        {offer.message ? (
          <View style={[styles.messageBox, { backgroundColor: `${colors.textSecondary}08` }]}>
            <Ionicons name="chatbox-ellipses-outline" size={14} color={colors.textMuted} />
            <Text secondary variant="caption" style={styles.message}>
              {offer.message}
            </Text>
          </View>
        ) : null}

        {showAccept && onAccept ? (
          <Pressable onPress={onAccept} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
            <LinearGradient colors={[...VORA_HIZMETLER_GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.acceptBtn}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text variant="label" style={{ color: '#fff' }}>
                Teklifi Kabul Et
              </Text>
            </LinearGradient>
          </Pressable>
        ) : null}

        {showReject && onReject && offer.status === 'pending' ? (
          <Pressable
            onPress={onReject}
            style={({ pressed }) => [
              styles.rejectBtn,
              { borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Ionicons name="close-circle-outline" size={16} color={colors.textSecondary} />
            <Text variant="caption" style={{ color: colors.textSecondary, fontWeight: '700' }}>
              Beğenmedim — Reddet
            </Text>
          </Pressable>
        ) : null}
      </View>
    </GlassCard>
  );
}

function DetailTile({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.detailTile, { backgroundColor: `${colors.textSecondary}08`, borderColor: colors.border }]}>
      <Ionicons name={icon} size={14} color={VORA_HIZMETLER_ACCENT} />
      <Text secondary variant="caption">
        {label}
      </Text>
      <Text variant="caption" style={{ fontWeight: '700' }}>
        {value}
      </Text>
    </View>
  );
}

function formatArrival(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return isToday ? `Bugün ${time}` : date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  headerBg: {
    ...StyleSheet.absoluteFillObject,
    height: 90,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  premiumText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F59E0B18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  priceCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: 2,
  },
  details: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: '46%',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  message: {
    flex: 1,
    lineHeight: 18,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
  },
});
