import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { WalletActivityRow } from '@/features/wallet/components/WalletActivityRow';
import { PUAN_LABEL } from '@/features/wallet/constants';
import type { WalletActivityFilter, WalletActivityItem } from '@/features/wallet/types';
import { activityDateGroupLabel } from '@/features/wallet/utils/activityLabels';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { WALLET_FEATURE } from '@/features/wallet/featureFlags';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  items: WalletActivityItem[];
  mode?: WalletActivityFilter;
  showFilters?: boolean;
  title?: string;
  emptyTitle?: string;
  emptyHint?: string;
};

const FILTER_OPTIONS: { id: WalletActivityFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'points', label: PUAN_LABEL },
  { id: 'try', label: 'TRY' },
];

function filterItems(items: WalletActivityItem[], filter: WalletActivityFilter): WalletActivityItem[] {
  if (filter === 'points') return items.filter((item) => item.currency === 'points');
  if (filter === 'try') return items.filter((item) => item.currency === 'try');
  return items;
}

function groupByDate(items: WalletActivityItem[]): { label: string; items: WalletActivityItem[] }[] {
  const groups: { label: string; items: WalletActivityItem[] }[] = [];
  for (const item of items) {
    const label = activityDateGroupLabel(item.occurredAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

export function WalletActivityFeed({
  items,
  mode = 'all',
  showFilters = false,
  title = 'Hesap hareketleri',
  emptyTitle = 'Henüz hareket yok',
  emptyHint = 'Güven puanı hareketleri, TRY ödemeleri ve reklam harcamaları burada listelenir.',
}: Props) {
  const { colors } = useTheme();
  const showActivityFilters = useFeatureVisible(WALLET_FEATURE.activityFilters);
  const [filter, setFilter] = useState<WalletActivityFilter>(mode);

  const activeFilter = showFilters && showActivityFilters ? filter : mode;
  const filtered = useMemo(() => filterItems(items, activeFilter), [items, activeFilter]);
  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text variant="label">{title}</Text>
        <Text variant="caption" secondary>
          {filtered.length} kayıt
        </Text>
      </View>

      {showFilters && showActivityFilters ? (
        <View style={styles.filters}>
          {FILTER_OPTIONS.map((option) => {
            const active = filter === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setFilter(option.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : `${colors.surface}CC`,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  style={{ color: active ? '#fff' : colors.textSecondary, fontWeight: active ? '700' : '500' }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {filtered.length === 0 ? (
        <GlassCard style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}12` }]}>
            <Ionicons name="receipt-outline" size={22} color={colors.primary} />
          </View>
          <Text variant="label" style={{ textAlign: 'center' }}>
            {emptyTitle}
          </Text>
          <Text variant="caption" secondary style={{ textAlign: 'center' }}>
            {emptyHint}
          </Text>
        </GlassCard>
      ) : (
        <View style={styles.groups}>
          {groups.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text variant="caption" secondary style={styles.groupLabel}>
                {group.label}
              </Text>
              <GlassCard padded={false} style={styles.list}>
                {group.items.map((item, index) => (
                  <View key={item.id} style={styles.rowWrap}>
                    <WalletActivityRow item={item} isLast={index === group.items.length - 1} />
                  </View>
                ))}
              </GlassCard>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  groups: {
    gap: spacing.md,
  },
  group: {
    gap: spacing.xs,
  },
  groupLabel: {
    fontWeight: '600',
    marginLeft: 2,
    textTransform: 'capitalize',
  },
  list: {
    overflow: 'hidden',
  },
  rowWrap: {
    paddingHorizontal: spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
