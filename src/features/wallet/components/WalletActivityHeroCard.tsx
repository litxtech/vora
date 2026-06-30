import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { WalletActivityItem, WalletActivityStatus } from '@/features/wallet/types';
import {
  formatActivityAmount,
  formatActivityFullDate,
  WALLET_ACTIVITY_STATUS_LABELS,
  WALLET_SECTOR_META,
} from '@/features/wallet/utils/activityLabels';
import { radius, spacing } from '@/constants/theme';

type Props = {
  item: WalletActivityItem;
};

type HeroTheme = {
  gradient: readonly [string, string, string, string];
  directionLabel: string;
  directionIcon: keyof typeof Ionicons.glyphMap;
};

const STATUS_META: Record<
  WalletActivityStatus,
  { color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  completed: { color: '#4ADE80', icon: 'checkmark-circle' },
  pending: { color: '#FBBF24', icon: 'time' },
  scheduled: { color: '#60A5FA', icon: 'calendar' },
};

const SECTOR_GRADIENTS: Record<
  WalletActivityItem['sector'],
  readonly [string, string, string, string]
> = {
  points: ['#D97706F2', '#F59E0BE6', '#FBBF24CC', '#92400E'],
  marketplace: ['#EA580CF2', '#F97316E6', '#FB923CCC', '#9A3412'],
  rides: ['#1D4ED8F2', '#3B82F6E6', '#2563EBCC', '#1E3A8A'],
  hotel: ['#047857F2', '#10B981E6', '#059669CC', '#064E3B'],
  ads: ['#6D28D9F2', '#8B5CF6E6', '#7C3AEDCC', '#4C1D95'],
  hizmetler: ['#0E7490F2', '#06B6D4E6', '#22D3EECC', '#155E75'],
};

const FALLBACK_GRADIENT = ['#334155F2', '#475569E6', '#64748BCC', '#1E293B'] as const;

function sectorGradient(sector: WalletActivityItem['sector']): readonly [string, string, string, string] {
  return SECTOR_GRADIENTS[sector] ?? FALLBACK_GRADIENT;
}

const TOPUP_GRADIENT = ['#047857F2', '#10B981E6', '#059669CC', '#064E3B'] as const;
const AD_TOPUP_GRADIENT = ['#5B21B6F2', '#7C3AEDE6', '#9333EACC', '#4C1D95'] as const;
const DEBIT_GRADIENT = ['#BE123CF2', '#EF4444E6', '#DC2626CC', '#7F1D1D'] as const;

function isTopupActivity(item: WalletActivityItem, isCredit: boolean): boolean {
  if (!isCredit) return false;
  if (item.sector === 'ads' && item.currency === 'try') return true;
  return item.title === 'Yükleme' || item.title.toLowerCase().includes('yükleme');
}

function resolveHeroTheme(item: WalletActivityItem, isCredit: boolean): HeroTheme {
  if (isTopupActivity(item, isCredit)) {
    if (item.sector === 'ads') {
      return {
        gradient: AD_TOPUP_GRADIENT,
        directionLabel: 'Reklam cüzdanına yükleme',
        directionIcon: 'add-circle',
      };
    }
    return {
      gradient: TOPUP_GRADIENT,
      directionLabel: 'Bakiye yükleme',
      directionIcon: 'add-circle',
    };
  }

  if (!isCredit && item.currency === 'try') {
    return {
      gradient: DEBIT_GRADIENT,
      directionLabel: item.sector === 'ads' ? 'Reklam harcaması' : 'Para çıkışı',
      directionIcon: 'remove-circle',
    };
  }

  if (item.currency === 'points') {
    return {
      gradient: SECTOR_GRADIENTS.points,
      directionLabel: isCredit ? 'Puan kazanımı' : 'Puan düşüşü',
      directionIcon: isCredit ? 'trending-up' : 'trending-down',
    };
  }

  return {
    gradient: sectorGradient(item.sector),
    directionLabel: isCredit ? 'Para girişi' : 'Para çıkışı',
    directionIcon: isCredit ? 'arrow-down-circle' : 'arrow-up-circle',
  };
}

export function WalletActivityHeroCard({ item }: Props) {
  const sector = WALLET_SECTOR_META[item.sector];
  const statusMeta = STATUS_META[item.status];
  const isCredit =
    item.currency === 'points' ? (item.pointsAmount ?? 0) >= 0 : (item.amountCents ?? 0) >= 0;
  const theme = resolveHeroTheme(item, isCredit);
  const topup = isTopupActivity(item, isCredit);

  return (
    <LinearGradient
      colors={[...theme.gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={[styles.orb, styles.orbA]} />
      <View style={[styles.orb, styles.orbB]} />
      <View style={[styles.orb, styles.orbC]} />

      <View style={styles.topRow}>
        <View style={styles.sectorBadge}>
          <Ionicons name={sector.icon} size={13} color="#fff" />
          <Text variant="caption" style={styles.badgeText}>
            {sector.label}
          </Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: `${statusMeta.color}28` }]}>
          <Ionicons name={statusMeta.icon} size={12} color={statusMeta.color} />
          <Text variant="caption" style={[styles.statusText, { color: statusMeta.color }]}>
            {WALLET_ACTIVITY_STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      <View style={styles.directionRow}>
        <View style={[styles.directionIcon, topup && styles.directionIconTopup]}>
          <Ionicons name={theme.directionIcon} size={18} color="#fff" />
        </View>
        <Text variant="caption" style={styles.directionLabel}>
          {theme.directionLabel}
        </Text>
      </View>

      <Text
        style={styles.amount}
        adjustsFontSizeToFit
        numberOfLines={1}
        minimumFontScale={0.6}
      >
        {formatActivityAmount(item)}
      </Text>

      <Text variant="h3" style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
      <Text variant="caption" style={styles.subtitle} numberOfLines={3}>
        {item.subtitle}
      </Text>

      <View style={styles.footer}>
        <View style={styles.footerChip}>
          <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.85)" />
          <Text variant="caption" style={styles.footerText} numberOfLines={2}>
            {formatActivityFullDate(item.occurredAt)}
          </Text>
        </View>
        <View style={styles.footerChip}>
          <Ionicons
            name={item.currency === 'points' ? 'shield-checkmark' : 'cash-outline'}
            size={12}
            color="rgba(255,255,255,0.85)"
          />
          <Text variant="caption" style={styles.footerText}>
            {item.currency === 'points' ? 'Güven puanı' : 'TRY'}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    minHeight: 220,
    gap: spacing.xs,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  orbA: {
    width: 160,
    height: 160,
    top: -50,
    right: -40,
  },
  orbB: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -20,
  },
  orbC: {
    width: 56,
    height: 56,
    top: '42%',
    right: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    flexShrink: 1,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 11,
  },
  directionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  directionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  directionIconTopup: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#fff',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  directionLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    flex: 1,
  },
  amount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
    letterSpacing: -1,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  title: {
    color: '#fff',
    textAlign: 'left',
    fontSize: 18,
    lineHeight: 24,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 'auto',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  footerChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 4,
    minWidth: 0,
  },
  footerText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
});
