import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  formatCents,
  formatMarketplaceDate,
  listingDetailPath,
  MARKETPLACE_ACCENT,
  OFFER_STATUS_LABELS,
} from '@/features/marketplace/constants';
import {
  respondToMarketplaceOffer,
  withdrawMarketplaceOffer,
} from '@/features/marketplace/services/offerData';
import type { MarketplaceOffer } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  offer: MarketplaceOffer;
  mode: 'received' | 'sent';
  onChanged: () => void;
};

export function MarketplaceOfferRow({ offer, mode, onChanged }: Props) {
  const { colors } = useTheme();
  const isPending = offer.status === 'pending';
  const statusColor =
    offer.status === 'pending'
      ? MARKETPLACE_ACCENT
      : offer.status === 'accepted'
        ? colors.success
        : colors.textMuted;

  const handleAccept = () => {
    Alert.alert('Teklifi kabul et', 'İlan rezerve edilir ve diğer bekleyen teklifler reddedilir. Devam?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Kabul et',
        onPress: async () => {
          const result = await respondToMarketplaceOffer(offer.id, 'accept');
          if (result.error) Alert.alert('Hata', result.error);
          else onChanged();
        },
      },
    ]);
  };

  const handleReject = () => {
    Alert.alert('Teklifi reddet', 'Bu teklif reddedilsin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Reddet',
        style: 'destructive',
        onPress: async () => {
          const result = await respondToMarketplaceOffer(offer.id, 'reject');
          if (result.error) Alert.alert('Hata', result.error);
          else onChanged();
        },
      },
    ]);
  };

  const handleWithdraw = () => {
    Alert.alert('Teklifi geri çek', 'Teklifiniz iptal edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Geri çek',
        style: 'destructive',
        onPress: async () => {
          const result = await withdrawMarketplaceOffer(offer.id);
          if (result.error) Alert.alert('Hata', result.error);
          else onChanged();
        },
      },
    ]);
  };

  return (
    <GlassCard style={styles.card}>
      <Pressable onPress={() => router.push(listingDetailPath(offer.listingId) as never)} style={styles.top}>
        {offer.listingCoverUrl ? (
          <Image source={{ uri: offer.listingCoverUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: `${MARKETPLACE_ACCENT}18` }]}>
            <Ionicons name="image-outline" size={18} color={MARKETPLACE_ACCENT} />
          </View>
        )}
        <View style={styles.meta}>
          <Text variant="label" numberOfLines={2}>
            {offer.listingTitle ?? 'İlan'}
          </Text>
          {offer.listingType !== 'trade' && offer.amountCents ? (
            <Text variant="caption" style={styles.amount}>
              {formatCents(offer.amountCents, offer.currency)}
            </Text>
          ) : null}
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={11} color={colors.textMuted} />
            <Text secondary variant="caption">
              {mode === 'received' ? `Alıcı: ${offer.buyerName ?? '—'}` : 'Verdiğiniz teklif'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
            <Text secondary variant="caption">
              {formatMarketplaceDate(offer.createdAt)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
            <Text variant="caption" style={{ color: statusColor, fontWeight: '700' }}>
              {OFFER_STATUS_LABELS[offer.status]}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>

      {offer.message ? (
        <Text secondary variant="caption" style={styles.message}>
          “{offer.message}”
        </Text>
      ) : null}

      {isPending ? (
        <View style={styles.actions}>
          {mode === 'received' ? (
            <>
              <Pressable onPress={handleAccept} style={[styles.actionBtn, { backgroundColor: MARKETPLACE_ACCENT }]}>
                <Ionicons name="checkmark" size={14} color="#fff" />
                <Text variant="caption" style={styles.actionBtnTextLight}>
                  Kabul
                </Text>
              </Pressable>
              <Pressable
                onPress={handleReject}
                style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: `${colors.danger}12` }]}
              >
                <Ionicons name="close" size={14} color={colors.danger} />
                <Text variant="caption" style={{ color: colors.danger, fontWeight: '700' }}>
                  Reddet
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={handleWithdraw}
              style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: `${colors.surface}CC` }]}
            >
              <Ionicons name="arrow-undo-outline" size={14} color={colors.textSecondary} />
              <Text variant="caption" secondary style={{ fontWeight: '700' }}>
                Geri çek
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md },
  top: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, gap: 3 },
  amount: { color: MARKETPLACE_ACCENT, fontWeight: '800' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginTop: 2,
  },
  message: { fontStyle: 'italic', paddingLeft: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionBtnTextLight: { color: '#fff', fontWeight: '700' },
});
