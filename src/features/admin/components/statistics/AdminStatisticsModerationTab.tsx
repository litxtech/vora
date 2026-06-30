import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import {
  MODERATION_GROUP_LABELS,
  MODERATION_QUEUE_ITEMS,
  type ModerationQueueItem,
} from '@/features/admin/services/statisticsPresentation';
import type { AdminStatisticsModeration } from '@/features/admin/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  moderation: AdminStatisticsModeration;
  total: number;
};

function groupAccent(
  group: ModerationQueueItem['group'],
  colors: { danger: string; warning: string; primary: string },
) {
  if (group === 'security') return colors.danger;
  if (group === 'verification') return colors.warning;
  return colors.primary;
}

export function AdminStatisticsModerationTab({ moderation, total }: Props) {
  const { colors } = useTheme();
  const groups: ModerationQueueItem['group'][] = ['security', 'verification', 'operations'];

  return (
    <>
      <GlassCard style={[styles.summaryCard, { borderColor: total > 0 ? `${colors.warning}44` : `${colors.success}44` }]}>
        <View style={[styles.summaryIcon, { backgroundColor: `${total > 0 ? colors.warning : colors.success}18` }]}>
          <Ionicons
            name={total > 0 ? 'alert-circle' : 'checkmark-circle'}
            size={28}
            color={total > 0 ? colors.warning : colors.success}
          />
        </View>
        <Text variant="label" style={styles.summaryLabel}>
          Toplam bekleyen işlem
        </Text>
        <Text style={[styles.summaryValue, { color: total > 0 ? colors.warning : colors.success }]}>
          {total.toLocaleString('tr-TR')}
        </Text>
        <Text secondary variant="caption" style={styles.summaryHint}>
          Tüm moderasyon kuyruklarındaki açık kayıtların toplamı
        </Text>
      </GlassCard>

      {groups.map((group) => {
        const items = MODERATION_QUEUE_ITEMS.filter((item) => item.group === group);
        const groupTotal = items.reduce((sum, item) => sum + moderation[item.key], 0);
        const accent = groupAccent(group, colors);

        return (
          <View key={group}>
            <AdminSectionHeader
              title={MODERATION_GROUP_LABELS[group]}
              hint={`${groupTotal.toLocaleString('tr-TR')} bekleyen`}
            />
            <View style={styles.statList}>
              {items.map((item) => {
                const value = moderation[item.key];
                return (
                  <AdminStatCard
                    key={item.key}
                    label={item.label}
                    value={value}
                    icon={item.icon}
                    accent={value > 0 ? accent : undefined}
                  />
                );
              })}
            </View>
          </View>
        );
      })}
    </>
  );
}

export function AdminStatisticsModerationEmpty() {
  return (
    <AdminEmptyState
      title="Moderasyon verisi yok"
      message="Detaylı kuyruk metrikleri için migration uygulanmalı."
      icon="shield-outline"
    />
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: spacing.xs,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderWidth: 1,
  },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 44,
    textAlign: 'center',
  },
  summaryHint: {
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  statList: { gap: spacing.xs },
});
