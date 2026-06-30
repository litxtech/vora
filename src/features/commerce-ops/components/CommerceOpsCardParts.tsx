import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { formatCommerceCents } from '@/features/commerce-ops/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type StatusTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

const TONE_COLORS: Record<StatusTone, { bg: string; text: string; border: string }> = {
  default: { bg: 'rgba(148,163,184,0.15)', text: '#94A3B8', border: 'rgba(148,163,184,0.35)' },
  primary: { bg: 'rgba(99,102,241,0.15)', text: '#6366F1', border: 'rgba(99,102,241,0.35)' },
  success: { bg: 'rgba(34,197,94,0.15)', text: '#22C55E', border: 'rgba(34,197,94,0.35)' },
  warning: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', border: 'rgba(245,158,11,0.35)' },
  danger: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', border: 'rgba(239,68,68,0.35)' },
};

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

export function CommerceOpsStatusBadge({ label, tone = 'default' }: StatusBadgeProps) {
  const palette = TONE_COLORS[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text variant="caption" style={[styles.badgeText, { color: palette.text }]}>
        {label}
      </Text>
    </View>
  );
}

type ModuleHeaderProps = {
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
  moduleLabel: string;
  title: string;
  subtitle?: string;
  statusLabel: string;
  statusTone?: StatusTone;
};

export function CommerceOpsModuleHeader({
  accent,
  icon,
  moduleLabel,
  title,
  subtitle,
  statusLabel,
  statusTone = 'default',
}: ModuleHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}18`, borderColor: `${accent}33` }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <View style={styles.headerCopy}>
        <View style={styles.headerTopLine}>
          <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
            {moduleLabel}
          </Text>
          <CommerceOpsStatusBadge label={statusLabel} tone={statusTone} />
        </View>
        <Text variant="label" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text secondary variant="caption" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

type PartyProps = {
  fromLabel: string;
  fromName: string;
  toLabel: string;
  toName: string;
};

export function CommerceOpsPartyRow({ fromLabel, fromName, toLabel, toName }: PartyProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.partyBlock, { backgroundColor: `${colors.surface}BB`, borderColor: colors.border }]}>
      <View style={styles.partyCell}>
        <Text secondary variant="caption" style={styles.partyRole}>
          {fromLabel}
        </Text>
        <View style={styles.partyNameRow}>
          <Ionicons name="person-outline" size={13} color={colors.textMuted} />
          <Text variant="caption" numberOfLines={1} style={styles.partyName}>
            {fromName}
          </Text>
        </View>
      </View>
      <View style={[styles.partyArrow, { backgroundColor: `${colors.textMuted}18` }]}>
        <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
      </View>
      <View style={styles.partyCell}>
        <Text secondary variant="caption" style={styles.partyRole}>
          {toLabel}
        </Text>
        <View style={styles.partyNameRow}>
          <Ionicons name="business-outline" size={13} color={colors.textMuted} />
          <Text variant="caption" numberOfLines={1} style={styles.partyName}>
            {toName}
          </Text>
        </View>
      </View>
    </View>
  );
}

type MoneyProps = {
  grossCents: number;
  commissionCents: number;
  netCents: number;
  netLabel?: string;
};

export function CommerceOpsMoneyBlock({
  grossCents,
  commissionCents,
  netCents,
  netLabel = 'Net ödeme',
}: MoneyProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.moneyBlock, { borderColor: colors.border }]}>
      <MoneyColumn label="Brüt tutar" value={formatCommerceCents(grossCents)} />
      <View style={[styles.moneyDivider, { backgroundColor: colors.border }]} />
      <MoneyColumn label="Komisyon" value={formatCommerceCents(commissionCents)} accent={colors.warning} />
      <View style={[styles.moneyDivider, { backgroundColor: colors.border }]} />
      <MoneyColumn label={netLabel} value={formatCommerceCents(netCents)} accent={colors.success} highlight />
    </View>
  );
}

function MoneyColumn({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  accent?: string;
  highlight?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.moneyColumn}>
      <Text secondary variant="caption" style={styles.moneyLabel}>
        {label}
      </Text>
      <Text
        variant={highlight ? 'label' : 'caption'}
        style={{ fontWeight: highlight ? '800' : '700', color: accent ?? colors.text }}
      >
        {value}
      </Text>
    </View>
  );
}

type MetaProps = {
  left: string;
  right?: string;
  rightTone?: StatusTone;
};

export function CommerceOpsMetaRow({ left, right, rightTone = 'default' }: MetaProps) {
  const { colors } = useTheme();
  const rightColor = rightTone === 'danger' ? colors.danger : rightTone === 'warning' ? colors.warning : colors.textSecondary;
  return (
    <View style={styles.metaRow}>
      <Text secondary variant="caption">
        {left}
      </Text>
      {right ? (
        <Text variant="caption" style={{ color: rightColor, fontWeight: '600' }}>
          {right}
        </Text>
      ) : null}
    </View>
  );
}

export function CommerceOpsCardAccent({ accent }: { accent: string }) {
  return <View style={[styles.accentBar, { backgroundColor: accent }]} />;
}

export function CommerceOpsActionFooter({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.actionFooter, { borderTopColor: colors.border }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeText: { fontWeight: '700', fontSize: 11 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerCopy: { flex: 1, gap: 2, minWidth: 0 },
  headerTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  partyBlock: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  partyCell: { flex: 1, padding: spacing.sm, gap: 2 },
  partyRole: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  partyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  partyName: { flex: 1, fontWeight: '600' },
  partyArrow: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moneyBlock: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  moneyColumn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: 2,
  },
  moneyLabel: { fontSize: 10, textAlign: 'center' },
  moneyDivider: { width: StyleSheet.hairlineWidth },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actionFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
