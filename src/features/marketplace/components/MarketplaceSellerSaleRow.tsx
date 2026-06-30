import {
  formatCents,
  formatMarketplaceDate,
  listingDetailPath,
  MARKETPLACE_ACCENT,
  MARKETPLACE_COMMISSION_RED,
  MARKETPLACE_SELL_GREEN,
} from '@/features/marketplace/constants';
import { PayoutCountdownBar } from '@/features/marketplace/components/PayoutCountdownBar';
import type { SellerSaleRecord } from '@/features/marketplace/types';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  sale: SellerSaleRecord;
  onPress: () => void;
};

export function MarketplaceSellerSaleRow({ sale, onPress }: Props) {
  const { colors } = useTheme();
  const dateLabel = formatMarketplaceDate(sale.soldAt);
  const isManual = sale.source === 'manual';
  const accent = isManual ? colors.textMuted : MARKETPLACE_ACCENT;
  const isPaidOut = Boolean(sale.payoutCompletedAt);
  const isPendingPayout = sale.isPlatformPayout && !isPaidOut;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      <GlassCard padded={false} style={styles.card}>
        <View style={[styles.accent, { backgroundColor: accent }]} />

        <View style={styles.body}>
          <View style={styles.mainRow}>
            {sale.listingCoverUrl ? (
              <Image source={{ uri: sale.listingCoverUrl }} style={styles.thumb} />
            ) : (
              <LinearGradient
                colors={[`${MARKETPLACE_ACCENT}30`, `${MARKETPLACE_ACCENT}12`]}
                style={styles.thumbEmpty}
              >
                <Ionicons name="image-outline" size={22} color={MARKETPLACE_ACCENT} />
              </LinearGradient>
            )}

            <View style={styles.meta}>
              <View style={styles.titleRow}>
                <Text variant="label" numberOfLines={2} style={styles.title}>
                  {sale.listingTitle}
                </Text>
              </View>

              <View style={styles.chipRow}>
                <SourceChip
                  icon={isManual ? 'hand-left-outline' : 'storefront-outline'}
                  label={isManual ? 'Manuel' : 'Platform'}
                  color={accent}
                />
                {sale.orderNumber ? (
                  <MetaChip icon="receipt-outline" label={sale.orderNumber} />
                ) : null}
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                <Text secondary variant="caption">
                  {dateLabel}
                </Text>
                {sale.buyerName ? (
                  <>
                    <Text secondary variant="caption">
                      ·
                    </Text>
                    <Ionicons name="person-outline" size={11} color={colors.textMuted} />
                    <Text secondary variant="caption" numberOfLines={1} style={styles.buyerName}>
                      {sale.buyerName}
                    </Text>
                  </>
                ) : null}
              </View>

              <StatusChip label={sale.statusLabel} paid={isPaidOut} pending={isPendingPayout} manual={isManual} />
            </View>

            <View style={styles.trailing}>
              <Text
                variant="label"
                style={styles.netAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {formatCents(sale.sellerNetCents, sale.currency)}
              </Text>
              <Text variant="caption" secondary style={styles.grossHint}>
                Brüt {formatCents(sale.grossAmountCents, sale.currency)}
              </Text>
              {sale.commissionCents > 0 ? (
                <Text variant="caption" style={styles.commissionHint}>
                  −{formatCents(sale.commissionCents, sale.currency)}
                </Text>
              ) : null}
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.chevron} />
            </View>
          </View>

          {sale.isPlatformPayout ? (
            <View style={styles.payoutWrap}>
              <PayoutCountdownBar payoutDueAt={sale.payoutDueAt} payoutCompletedAt={sale.payoutCompletedAt} />
            </View>
          ) : isManual ? (
            <View style={[styles.manualBanner, { backgroundColor: `${colors.textMuted}10`, borderColor: `${colors.border}88` }]}>
              <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
              <Text secondary variant="caption" style={styles.manualHint}>
                Elden / platform dışı — ödeme satıcıda
              </Text>
            </View>
          ) : null}
        </View>
      </GlassCard>
    </Pressable>
  );
}

function SourceChip({
  icon,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.sourceChip, { backgroundColor: `${color}14`, borderColor: `${color}28` }]}>
      <Ionicons name={icon} size={10} color={color} />
      <Text variant="caption" style={[styles.sourceChipText, { color }]}>
        {label}
      </Text>
    </View>
  );
}

function MetaChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metaChip, { backgroundColor: `${colors.surface}CC`, borderColor: colors.border }]}>
      <Ionicons name={icon} size={10} color={colors.textMuted} />
      <Text variant="caption" secondary style={styles.metaChipText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function StatusChip({
  label,
  paid,
  pending,
  manual,
}: {
  label: string;
  paid?: boolean;
  pending?: boolean;
  manual?: boolean;
}) {
  const { colors } = useTheme();
  const tone = paid ? MARKETPLACE_SELL_GREEN : pending ? '#FFB300' : manual ? colors.textMuted : MARKETPLACE_ACCENT;

  return (
    <View style={[styles.statusChip, { backgroundColor: `${tone}14` }]}>
      <Ionicons
        name={paid ? 'checkmark-circle' : pending ? 'time' : manual ? 'hand-left-outline' : 'ellipse'}
        size={10}
        color={tone}
      />
      <Text variant="caption" style={[styles.statusChipText, { color: tone }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    flexDirection: 'row',
  },
  accent: {
    width: 3,
    alignSelf: 'stretch',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  body: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    gap: spacing.sm,
  },
  mainRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    paddingLeft: spacing.sm,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
  },
  thumbEmpty: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { flex: 1, fontSize: 14, lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sourceChipText: { fontWeight: '700', fontSize: 10 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 110,
  },
  metaChipText: { fontSize: 10, fontWeight: '600' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  buyerName: { flexShrink: 1, maxWidth: 100 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusChipText: { fontWeight: '600', fontSize: 10 },
  trailing: {
    alignItems: 'flex-end',
    maxWidth: 96,
    paddingTop: 2,
  },
  netAmount: {
    color: MARKETPLACE_SELL_GREEN,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: -0.3,
    textAlign: 'right',
  },
  grossHint: { fontSize: 10, marginTop: 1 },
  commissionHint: {
    color: MARKETPLACE_COMMISSION_RED,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  chevron: { marginTop: 4 },
  payoutWrap: { paddingHorizontal: spacing.sm },
  manualBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  manualHint: { flex: 1, fontStyle: 'italic', fontSize: 11 },
});

export function sellerSalePressTarget(sale: SellerSaleRecord): { path: string; isOrder: boolean } {
  if (sale.orderId) {
    return { path: `/marketplace-center/order/${sale.orderId}`, isOrder: true };
  }
  return { path: listingDetailPath(sale.listingId), isOrder: false };
}
