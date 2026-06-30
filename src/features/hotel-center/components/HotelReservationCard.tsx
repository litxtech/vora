import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  HOTEL_ACCENT,
  HOTEL_RESERVATION_STATUS_COLORS,
  HOTEL_RESERVATION_STATUS_LABELS,
  formatHotelPrice,
  hotelDetailPath,
} from '@/features/hotel-center/constants';
import { HotelFeeBreakdown } from '@/features/hotel-center/components/HotelFeeBreakdown';
import { hotelReservationPayoutLabel } from '@/features/hotel-center/services/ownerEarnings';
import type { HotelReservation } from '@/features/hotel-center/types';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  reservation: HotelReservation;
  role: 'guest' | 'owner';
  onComplete?: () => void;
  onShareReceipt?: () => void;
  sharingReceipt?: boolean;
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function HotelReservationCard({ reservation, role, onComplete, onShareReceipt, sharingReceipt }: Props) {
  const { colors } = useTheme();
  const statusColor = HOTEL_RESERVATION_STATUS_COLORS[reservation.status];
  const amount = reservation.grossAmountCents / 100;
  const ownerNet = (reservation.ownerPayoutCents ?? reservation.grossAmountCents) / 100;
  const guestDisplayName = reservation.guestName?.trim() || 'Misafir';

  const handleCallGuest = () => {
    if (!reservation.guestPhone) return;
    void openUrl(`tel:${reservation.guestPhone}`);
  };

  return (
    <GlassCard style={[styles.card, { borderLeftWidth: 3, borderLeftColor: statusColor }]}>
      <Pressable onPress={() => router.push(hotelDetailPath(reservation.hotelId) as never)}>
        <View style={styles.header}>
          {reservation.hotelCoverUrl ? (
            <Image source={{ uri: reservation.hotelCoverUrl }} style={styles.cover} />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: `${HOTEL_ACCENT}18` }]}>
              <Ionicons name="bed-outline" size={22} color={HOTEL_ACCENT} />
            </View>
          )}
          <View style={styles.headerCopy}>
            <Text variant="label" numberOfLines={2}>
              {role === 'owner' ? guestDisplayName : (reservation.hotelName ?? 'Otel')}
            </Text>
            <Text secondary variant="caption" style={role === 'owner' ? styles.codeText : undefined}>
              {reservation.reservationCode}
            </Text>
            {role === 'owner' ? (
              <Text secondary variant="caption" numberOfLines={1}>
                {reservation.hotelName ?? 'Otel'}
              </Text>
            ) : null}
            {role === 'owner' && reservation.guestPhone ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleCallGuest();
                }}
                style={styles.phoneRow}
              >
                <Ionicons name="call-outline" size={12} color={HOTEL_ACCENT} />
                <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '600' }}>
                  {reservation.guestPhone}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
            <Text variant="caption" style={{ color: statusColor, fontWeight: '700', fontSize: 11 }}>
              {HOTEL_RESERVATION_STATUS_LABELS[reservation.status]}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text variant="caption" secondary>
              {formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="moon-outline" size={14} color={colors.textMuted} />
            <Text variant="caption" secondary>
              {reservation.nights} gece · {reservation.guestsCount} kişi
            </Text>
          </View>
        </View>

        {reservation.guestNote ? (
          <Text variant="caption" secondary numberOfLines={2}>
            Not: {reservation.guestNote}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <Text variant="label" style={{ color: HOTEL_ACCENT }}>
              {formatHotelPrice(amount)}
            </Text>
            {role === 'owner' && reservation.status !== 'cancelled' && reservation.status !== 'refunded' ? (
              <Text variant="caption" secondary>
                Net: {formatHotelPrice(ownerNet)}
                {reservation.payoutCompletedAt
                  ? ' · Yatırıldı'
                  : reservation.status === 'completed'
                    ? ` · ${hotelReservationPayoutLabel(reservation)}`
                    : ' · Konaklama sonrası'}
              </Text>
            ) : null}
          </View>
          {reservation.studentDiscountPct > 0 ? (
            <Text variant="caption" style={{ color: HOTEL_ACCENT }}>
              %{reservation.studentDiscountPct} öğrenci ind.
            </Text>
          ) : null}
        </View>

        {reservation.status !== 'cancelled' && reservation.status !== 'refunded' ? (
          <HotelFeeBreakdown
            grossCents={reservation.grossAmountCents}
            commissionCents={reservation.commissionCents}
            ownerPayoutCents={reservation.ownerPayoutCents}
            role={role}
            compact={role === 'owner'}
          />
        ) : null}
      </Pressable>

      {role === 'owner' && onShareReceipt ? (
        <Pressable
          onPress={onShareReceipt}
          disabled={sharingReceipt}
          style={[styles.receiptBtn, { borderColor: colors.border, opacity: sharingReceipt ? 0.6 : 1 }]}
        >
          <Ionicons name="receipt-outline" size={16} color={HOTEL_ACCENT} />
          <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '600' }}>
            {sharingReceipt ? 'Özet hazırlanıyor…' : 'Rezervasyon özetini paylaş'}
          </Text>
        </Pressable>
      ) : null}

      {role === 'owner' && reservation.status === 'confirmed' && onComplete ? (
        <Pressable onPress={onComplete} style={[styles.completeBtn, { borderColor: colors.border }]}>
          <Ionicons name="checkmark-circle-outline" size={16} color={HOTEL_ACCENT} />
          <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '600' }}>
            Konaklama tamamlandı
          </Text>
        </Pressable>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cover: { width: 56, height: 56, borderRadius: radius.md },
  coverPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, gap: 2 },
  codeText: { fontWeight: '700', letterSpacing: 0.2 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  metaRow: { gap: spacing.xs, marginTop: spacing.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
  },
});
