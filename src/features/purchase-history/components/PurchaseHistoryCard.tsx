import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import {
  DISPUTE_REASON_MAX,
  DISPUTE_REASON_MIN,
  DISPUTE_STATUS_LABELS,
  USAGE_LABELS,
} from '@/features/purchase-history/constants';
import type { PackagePurchase, PurchaseSource } from '@/features/purchase-history/types';
import {
  canDisputePurchase,
  disputeWindowLabel,
  formatPurchaseDate,
} from '@/features/purchase-history/utils';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const SOURCE_ICONS: Record<PurchaseSource, keyof typeof Ionicons.glyphMap> = {
  premium: 'diamond-outline',
  platform_support: 'heart-outline',
  shop_boost: 'storefront-outline',
};

type Props = {
  item: PackagePurchase;
  expanded: boolean;
  submitting: boolean;
  error: string | null;
  onToggleDispute: () => void;
  onSubmit: (reason: string) => void;
};

export function PurchaseHistoryCard({
  item,
  expanded,
  submitting,
  error,
  onToggleDispute,
  onSubmit,
}: Props) {
  const { colors } = useTheme();
  const [reason, setReason] = useState('');
  const open = canDisputePurchase(item.purchasedAt, item.dispute != null);
  const usageColor = item.usage === 'using' ? colors.success : colors.textSecondary;
  const problemColor = item.hadProblem ? colors.danger : colors.textSecondary;
  const trimmed = reason.trim();
  const reasonReady = trimmed.length >= DISPUTE_REASON_MIN && trimmed.length <= DISPUTE_REASON_MAX;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: `${colors.primary}14` }]}>
          <Ionicons name={SOURCE_ICONS[item.source]} size={18} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text variant="label" numberOfLines={2}>
            {item.title}
          </Text>
          {item.detail ? (
            <Text secondary variant="caption" numberOfLines={2}>
              {item.detail}
            </Text>
          ) : null}
        </View>
        {item.usage === 'using' ? (
          <View style={[styles.usingChip, { backgroundColor: `${colors.success}18` }]}>
            <View style={[styles.usingDot, { backgroundColor: colors.success }]} />
            <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
              {USAGE_LABELS.using}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.facts}>
        <Fact icon="calendar-outline" label="Satın alma" value={formatPurchaseDate(item.purchasedAt)} />
        <Fact
          icon="checkmark-circle-outline"
          label="Kullanım"
          value={USAGE_LABELS[item.usage]}
          valueColor={usageColor}
        />
        <Fact
          icon={item.hadProblem ? 'alert-circle-outline' : 'shield-checkmark-outline'}
          label="Sorun"
          value={item.hadProblem ? 'Sorun çıktı' : 'Sorun çıkmadı'}
          valueColor={problemColor}
        />
      </View>

      {item.dispute ? (
        <View style={[styles.disputeBox, { backgroundColor: `${colors.warning}14` }]}>
          <Text variant="caption" style={{ color: colors.warning, fontWeight: '700' }}>
            {DISPUTE_STATUS_LABELS[item.dispute.status]}
          </Text>
          <Text secondary variant="caption">
            {item.dispute.reason}
          </Text>
        </View>
      ) : (
        <View style={styles.disputeActions}>
          <Text secondary variant="caption">
            {disputeWindowLabel(item.purchasedAt)}
          </Text>
          {open ? (
            <Pressable accessibilityRole="button" onPress={onToggleDispute} hitSlop={8}>
              <Text variant="label" style={{ color: colors.primary }}>
                {expanded ? 'Vazgeç' : 'İtiraz et'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {expanded && open ? (
        <View style={styles.form}>
          <Input
            label="İtirazınız"
            placeholder="Pakette ne sorun yaşadığınızı yazın"
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={DISPUTE_REASON_MAX}
            textAlignVertical="top"
            style={styles.reason}
            error={error}
            hint={`${trimmed.length}/${DISPUTE_REASON_MAX} · en az ${DISPUTE_REASON_MIN} karakter`}
          />
          <Button
            title="İtirazı gönder"
            size="compact"
            loading={submitting}
            disabled={!reasonReady || submitting}
            onPress={() => onSubmit(trimmed)}
          />
        </View>
      ) : null}
    </GlassCard>
  );
}

function Fact({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text secondary variant="caption" style={styles.factLabel}>
        {label}
      </Text>
      <Text variant="caption" style={[styles.factValue, valueColor ? { color: valueColor } : null]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  usingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  usingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  facts: {
    marginTop: spacing.sm,
    gap: 6,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  factLabel: {
    width: 78,
  },
  factValue: {
    flex: 1,
    fontWeight: '600',
  },
  disputeBox: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
  },
  disputeActions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  form: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  reason: {
    minHeight: 96,
    paddingTop: 12,
  },
});
