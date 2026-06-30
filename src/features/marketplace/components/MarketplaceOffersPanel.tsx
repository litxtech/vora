import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  formatCents,
  formatMarketplaceDate,
  MARKETPLACE_ACCENT,
  OFFER_STATUS_LABELS,
} from '@/features/marketplace/constants';
import { respondToMarketplaceOffer } from '@/features/marketplace/services/offerData';
import type { MarketplaceOffer } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  offers: MarketplaceOffer[];
  listingType: 'sale' | 'negotiable' | 'trade' | 'free';
  onChanged: () => void;
};

export function MarketplaceOffersPanel({ offers, listingType, onChanged }: Props) {
  const { colors } = useTheme();
  const pending = offers.filter((o) => o.status === 'pending');
  const accepted = offers.filter((o) => o.status === 'accepted');

  if (!pending.length && !accepted.length) return null;

  const handleRespond = (offer: MarketplaceOffer, action: 'accept' | 'reject') => {
    const title = action === 'accept' ? 'Teklifi kabul et' : 'Teklifi reddet';
    const body =
      action === 'accept'
        ? 'İlan rezerve edilir ve diğer bekleyen teklifler reddedilir. Devam?'
        : 'Bu teklif reddedilsin mi?';

    Alert.alert(title, body, [
      { text: 'İptal', style: 'cancel' },
      {
        text: action === 'accept' ? 'Kabul et' : 'Reddet',
        style: action === 'accept' ? 'default' : 'destructive',
        onPress: async () => {
          const result = await respondToMarketplaceOffer(offer.id, action);
          if (result.error) Alert.alert('Hata', result.error);
          else onChanged();
        },
      },
    ]);
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="pricetag-outline" size={16} color={MARKETPLACE_ACCENT} />
        <Text variant="label">Teklifler</Text>
        {pending.length ? (
          <View style={[styles.badge, { backgroundColor: `${MARKETPLACE_ACCENT}20` }]}>
            <Text variant="caption" style={{ color: MARKETPLACE_ACCENT, fontWeight: '700' }}>
              {pending.length} bekliyor
            </Text>
          </View>
        ) : null}
      </View>

      {[...pending, ...accepted].map((offer) => (
        <View
          key={offer.id}
          style={[styles.offerRow, { borderColor: colors.border, backgroundColor: `${colors.surface}66` }]}
        >
          <View style={styles.offerMeta}>
            <Text variant="caption" style={styles.buyerName}>
              {offer.buyerName ?? 'Alıcı'}
            </Text>
            {listingType !== 'trade' && offer.amountCents ? (
              <Text variant="label" style={{ color: MARKETPLACE_ACCENT }}>
                {formatCents(offer.amountCents, offer.currency)}
              </Text>
            ) : null}
            {offer.message ? (
              <Text secondary variant="caption" numberOfLines={3}>
                {offer.message}
              </Text>
            ) : null}
            <Text secondary variant="caption">
              {OFFER_STATUS_LABELS[offer.status]} · {formatMarketplaceDate(offer.createdAt)}
            </Text>
          </View>

          {offer.status === 'pending' ? (
            <View style={styles.actions}>
              <Pressable
                onPress={() => handleRespond(offer, 'accept')}
                style={[styles.actionBtn, { backgroundColor: MARKETPLACE_ACCENT }]}
              >
                <Ionicons name="checkmark" size={14} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => handleRespond(offer, 'reject')}
                style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: `${colors.danger}12` }]}
              >
                <Ionicons name="close" size={14} color={colors.danger} />
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  badge: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  offerMeta: { flex: 1, gap: 2 },
  buyerName: { fontWeight: '700' },
  actions: { gap: spacing.xs },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
