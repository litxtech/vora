import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { LISTING_STATUS_LABELS, listingClonePath, listingEditPath, marketplaceAccountPath, MARKETPLACE_ACCENT } from '@/features/marketplace/constants';
import { setOwnerListingStatus } from '@/features/marketplace/services/listingData';
import type { MarketplaceListing, MarketplaceListingStatus, MarketplaceOrder } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  listing: MarketplaceListing;
  order: MarketplaceOrder | null;
  onChanged: () => void;
};

const STATUS_COLORS: Record<MarketplaceListingStatus, string> = {
  active: '#43A047',
  reserved: '#FFB300',
  sold: '#78909C',
  removed: '#EF5350',
  archived: '#607D8B',
};

type ActionDef = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  status?: MarketplaceListingStatus;
  tone?: 'primary' | 'neutral' | 'danger';
  confirm?: string;
  onPress?: () => void;
};

export function MarketplaceOwnerPanel({ listing, order, onChanged }: Props) {
  const { colors } = useTheme();
  const statusColor = STATUS_COLORS[listing.status] ?? colors.textMuted;

  const applyStatus = (status: MarketplaceListingStatus, confirm?: string) => {
    const run = async () => {
      const result = await setOwnerListingStatus(listing.id, status);
      if (result.error) Alert.alert('Hata', result.error);
      else onChanged();
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

  const primaryActions: ActionDef[] = [];
  const secondaryActions: ActionDef[] = [];

  switch (listing.status) {
    case 'active':
      primaryActions.push(
        { label: 'Satıldı işaretle', icon: 'checkmark-circle-outline', status: 'sold', tone: 'primary', confirm: 'İlan satıldı olarak işaretlensin mi?' },
        { label: 'Rezerve', icon: 'time-outline', status: 'reserved', tone: 'neutral', confirm: 'İlan geçici olarak rezerve edilsin mi?' },
      );
      break;
    case 'reserved':
      primaryActions.push(
        { label: 'Satılığa çıkar', icon: 'storefront-outline', status: 'active', tone: 'primary' },
        { label: 'Satıldı işaretle', icon: 'checkmark-circle-outline', status: 'sold', tone: 'neutral', confirm: 'Satıldı olarak işaretlensin mi?' },
      );
      break;
    case 'sold':
      primaryActions.push(
        { label: 'Satılığa çıkar', icon: 'refresh-outline', status: 'active', tone: 'primary', confirm: 'Ürün tekrar satışa sunulsun mu?' },
      );
      break;
    case 'removed':
      primaryActions.push(
        { label: 'Yeniden yayınla', icon: 'refresh-outline', status: 'active', tone: 'primary', confirm: 'İlan tekrar yayınlansın mı?' },
      );
      break;
    case 'archived':
      primaryActions.push(
        { label: 'Satılığa çıkar', icon: 'storefront-outline', status: 'active', tone: 'primary' },
      );
      break;
  }

  if (listing.status !== 'removed' && listing.status !== 'archived') {
    secondaryActions.push({
      label: 'Varyant ekle',
      icon: 'copy-outline',
      tone: 'neutral',
      onPress: () => router.push(listingClonePath(listing.id) as never),
    });
    secondaryActions.push({
      label: 'Düzenle',
      icon: 'create-outline',
      tone: 'neutral',
      onPress: () => router.push(listingEditPath(listing.id) as never),
    });
  }

  if (listing.status !== 'removed') {
    secondaryActions.push({
      label: 'Kaldır',
      icon: 'trash-outline',
      status: 'removed',
      tone: 'danger',
      confirm: 'İlan kaldırılsın mı?',
    });
  }

  if (listing.status === 'sold' || listing.status === 'removed') {
    secondaryActions.push({
      label: 'Arşivle',
      icon: 'archive-outline',
      status: 'archived',
      tone: 'neutral',
      confirm: 'İlan arşive alınsın mı?',
    });
  }

  const runAction = (action: ActionDef) => {
    if (action.onPress) {
      action.onPress();
      return;
    }
    if (action.status) applyStatus(action.status, action.confirm);
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text variant="label">İlan yönetimi</Text>
          <Text secondary variant="caption">
            Benzersiz görüntülenme · hesap başına 1
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text variant="caption" style={{ color: statusColor, fontWeight: '700' }}>
            {LISTING_STATUS_LABELS[listing.status]}
          </Text>
        </View>
      </View>

      <View style={[styles.statsBar, { backgroundColor: `${colors.surface}88` }]}>
        <StatCell icon="eye-outline" value={listing.viewCount} label="Görüntülenme" />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatCell icon="heart-outline" value={listing.favoriteCount} label="Favori" />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatCell icon="chatbubble-outline" value={listing.commentCount} label="Soru" />
      </View>

      {primaryActions.length ? (
        <View style={styles.actionSection}>
          <View style={styles.primaryRow}>
            {primaryActions.map((action) => (
              <ActionButton
                key={action.label}
                action={action}
                flex={primaryActions.length > 1 ? 1 : undefined}
                onPress={() => runAction(action)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {secondaryActions.length ? (
        <View style={[styles.actionSection, primaryActions.length ? styles.actionSectionDivider : null, { borderTopColor: colors.border }]}>
          <View style={styles.secondaryRow}>
            {secondaryActions.map((action) => (
              <ActionButton key={action.label} action={action} compact onPress={() => runAction(action)} />
            ))}
          </View>
        </View>
      ) : null}

      {order ? (
        <View style={[styles.footerLinks, { borderTopColor: colors.border }]}>
          <FooterLink
            icon="receipt-outline"
            label="Sipariş detayı"
            onPress={() => router.push(`/marketplace-center/order/${order.id}` as never)}
          />
          <FooterLink
            icon="grid-outline"
            label="Hesabım"
            onPress={() => router.push(marketplaceAccountPath() as never)}
          />
        </View>
      ) : null}
    </GlassCard>
  );
}

function StatCell({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.statCell}>
      <Ionicons name={icon} size={14} color={MARKETPLACE_ACCENT} />
      <Text variant="label" style={styles.statValue}>
        {value}
      </Text>
      <Text secondary variant="caption">
        {label}
      </Text>
    </View>
  );
}

function ActionButton({
  action,
  onPress,
  flex,
  compact,
}: {
  action: ActionDef;
  onPress: () => void;
  flex?: number;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const tone = action.tone ?? 'neutral';

  const bg =
    tone === 'primary'
      ? MARKETPLACE_ACCENT
      : tone === 'danger'
        ? `${colors.danger}12`
        : `${colors.surface}CC`;
  const border = tone === 'danger' ? colors.danger : tone === 'neutral' ? colors.border : 'transparent';
  const textColor = tone === 'primary' ? '#fff' : tone === 'danger' ? colors.danger : colors.text;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        compact ? styles.compactBtn : styles.primaryBtn,
        flex != null && { flex },
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: tone === 'primary' ? 0 : 1,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Ionicons name={action.icon} size={compact ? 12 : 14} color={textColor} />
      <Text variant="caption" style={[styles.actionLabel, compact && styles.compactLabel, { color: textColor }]} numberOfLines={1}>
        {action.label}
      </Text>
    </Pressable>
  );
}

function FooterLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.footerLink}>
      <Ionicons name={icon} size={15} color={colors.textSecondary} />
      <Text variant="caption" secondary>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statsBar: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  actionSection: { gap: spacing.xs },
  actionSectionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  primaryRow: { flexDirection: 'row', gap: spacing.md },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  secondaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  compactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  actionLabel: { fontWeight: '700', fontSize: 11 },
  compactLabel: { fontSize: 10 },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  footerLink: { alignItems: 'center', gap: 2, paddingVertical: 4, minWidth: 72 },
});
