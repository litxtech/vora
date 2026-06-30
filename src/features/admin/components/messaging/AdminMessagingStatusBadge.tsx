import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AdminContentStatusBadge } from '@/features/admin/components/content/AdminContentStatusBadge';
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS } from '@/features/admin/constants';
import {
  formatMessagingRelativeTime,
  isUrgentMessagingReport,
  MESSAGING_TARGET_ICONS,
  MESSAGING_TARGET_LABELS,
  messagingStatusTone,
  type MessagingTargetType,
} from '@/features/admin/services/messagingPresentation';
import type { MessagingReportRow } from '@/features/admin/services/messagingModeration';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  report: MessagingReportRow;
  busy?: boolean;
};

export function AdminMessagingStatusBadge({ report }: Props) {
  return (
    <AdminContentStatusBadge
      label={REPORT_STATUS_LABELS[report.status]}
      tone={messagingStatusTone(report.status)}
    />
  );
}

export function AdminMessagingTargetBadge({ targetType }: { targetType: string }) {
  const { colors } = useTheme();
  const target = targetType as MessagingTargetType;
  const label = MESSAGING_TARGET_LABELS[target] ?? targetType;
  const icon = (MESSAGING_TARGET_ICONS[target] ?? 'help-outline') as keyof typeof Ionicons.glyphMap;

  return (
    <View style={[styles.targetBadge, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}33` }]}>
      <Ionicons name={icon} size={12} color={colors.primary} />
      <Text variant="caption" style={{ color: colors.primary, fontWeight: '700', fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

export function AdminMessagingReportMeta({ report }: Props) {
  const { colors } = useTheme();
  const urgent = isUrgentMessagingReport(report.reason);

  return (
    <View style={styles.meta}>
      {urgent ? (
        <View style={[styles.urgentBadge, { backgroundColor: `${colors.danger}18`, borderColor: `${colors.danger}55` }]}>
          <Ionicons name="alert-circle" size={12} color={colors.danger} />
          <Text variant="caption" style={{ color: colors.danger, fontWeight: '800', fontSize: 11 }}>
            ACİL
          </Text>
        </View>
      ) : null}
      <AdminMessagingTargetBadge targetType={report.target_type} />
      <AdminMessagingStatusBadge report={report} />
      {report.priority > 0 ? (
        <AdminContentStatusBadge label={`Öncelik ${report.priority}`} tone="danger" />
      ) : null}
    </View>
  );
}

export function AdminMessagingReportSummary({ report }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.summary}>
      <Text variant="label">{REPORT_REASON_LABELS[report.reason] ?? report.reason}</Text>
      <Text secondary variant="caption">
        Şikayet eden: @{report.reporter_username ?? '—'} · {formatMessagingRelativeTime(report.created_at)}
      </Text>
      {report.details ? (
        <Text secondary variant="caption" numberOfLines={2}>
          {report.details}
        </Text>
      ) : null}
      {report.resolution_note ? (
        <Text variant="caption" style={{ color: colors.success }}>
          Not: {report.resolution_note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  summary: { gap: 4 },
});
