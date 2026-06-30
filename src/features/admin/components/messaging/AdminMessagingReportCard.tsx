import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import {
  AdminMessagingReportMeta,
  AdminMessagingReportSummary,
} from '@/features/admin/components/messaging/AdminMessagingStatusBadge';
import { isUrgentMessagingReport } from '@/features/admin/services/messagingPresentation';
import type { MessagingReportRow } from '@/features/admin/services/messagingModeration';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  report: MessagingReportRow;
  busy?: boolean;
  onPreview: (report: MessagingReportRow) => void;
  onAssign: (report: MessagingReportRow) => void;
  onResolve: (report: MessagingReportRow, action: 'approve' | 'reject' | 'warn' | 'hide' | 'remove') => void;
  onLock?: (report: MessagingReportRow) => void;
  onMute?: (report: MessagingReportRow) => void;
};

export function AdminMessagingReportCard({
  report,
  busy = false,
  onPreview,
  onAssign,
  onResolve,
  onLock,
  onMute,
}: Props) {
  const { colors } = useTheme();
  const urgent = isUrgentMessagingReport(report.reason);
  const isOpen = report.status === 'pending' || report.status === 'reviewing';

  return (
    <GlassCard
      style={[styles.card, urgent && isOpen && { borderColor: colors.danger, borderWidth: 1.5 }]}
    >
      <AdminMessagingReportMeta report={report} />
      <AdminMessagingReportSummary report={report} />

      <View style={styles.actions}>
        <AdminActionChip
          label="Detay"
          icon="eye-outline"
          tone="primary"
          onPress={() => onPreview(report)}
          loading={busy}
          compact
        />

        {report.status === 'pending' ? (
          <>
            <AdminActionChip
              label="İncele"
              icon="hand-left-outline"
              tone="primary"
              onPress={() => onAssign(report)}
              loading={busy}
              compact
            />
            <AdminActionChip
              label="Onayla"
              icon="checkmark-circle-outline"
              tone="success"
              onPress={() => onResolve(report, 'approve')}
              loading={busy}
              compact
            />
            <AdminActionChip
              label="Reddet"
              icon="close-circle-outline"
              tone="danger"
              onPress={() => onResolve(report, 'reject')}
              loading={busy}
              compact
            />
          </>
        ) : null}

        {report.status === 'reviewing' ? (
          <>
            <AdminActionChip
              label="Uyarı"
              icon="alert-circle-outline"
              tone="warning"
              onPress={() => onResolve(report, 'warn')}
              loading={busy}
              compact
            />
            <AdminActionChip
              label="Gizle"
              icon="eye-off-outline"
              onPress={() => onResolve(report, 'hide')}
              loading={busy}
              compact
            />
            <AdminActionChip
              label="Kaldır"
              icon="trash-outline"
              tone="danger"
              onPress={() => onResolve(report, 'remove')}
              loading={busy}
              compact
            />
          </>
        ) : null}

        {isOpen && report.target_type === 'conversation' && onLock ? (
          <AdminActionChip
            label="Kilitle"
            icon="lock-closed-outline"
            tone="danger"
            onPress={() => onLock(report)}
            loading={busy}
            compact
          />
        ) : null}

        {isOpen && onMute ? (
          <AdminActionChip
            label="Sustur"
            icon="volume-mute-outline"
            tone="warning"
            onPress={() => onMute(report)}
            loading={busy}
            compact
          />
        ) : null}
      </View>

      {report.status === 'approved' || report.status === 'rejected' ? (
        <View style={styles.resolvedRow}>
          <Ionicons
            name={report.status === 'approved' ? 'checkmark-done-outline' : 'close-outline'}
            size={14}
            color={report.status === 'approved' ? colors.success : colors.textMuted}
          />
          <Text secondary variant="caption">
            {report.resolved_at
              ? `Sonuçlandırıldı · ${new Date(report.resolved_at).toLocaleString('tr-TR')}`
              : 'Sonuçlandırıldı'}
          </Text>
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  resolvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
