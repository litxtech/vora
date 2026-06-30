import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS } from '@/features/admin/constants';
import { assignReport, fetchReports, resolveReport } from '@/features/admin/services/reportQueue';
import type { ContentReportRow, ReportQueueStatus } from '@/features/admin/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

const STATUS_FILTERS: { id: ReportQueueStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'pending', label: 'Bekliyor' },
  { id: 'reviewing', label: 'İnceleniyor' },
  { id: 'approved', label: 'Sonuçlandı' },
  { id: 'rejected', label: 'Reddedildi' },
];

export function AdminReportsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [reports, setReports] = useState<ContentReportRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReportQueueStatus | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const result = await fetchReports(statusFilter === 'all' ? undefined : { status: statusFilter });
      setReports(result.data as ContentReportRow[]);
      setLoading(false);
      setRefreshing(false);
    },
    [statusFilter],
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleAssign = async (reportId: string) => {
    if (!user) return;
    await assignReport(reportId, user.id);
    load(true);
  };

  const handleResolve = (report: ContentReportRow, status: ReportQueueStatus, action?: 'warn' | 'hide' | 'remove') => {
    Alert.alert('Şikayeti sonuçlandır', `${REPORT_STATUS_LABELS[status]} olarak işaretlensin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          const { error } = await resolveReport(report.id, status, undefined, action);
          if (error) Alert.alert('Hata', error);
          else load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Şikayet Kuyruğu"
      subtitle="Moderasyon paneli"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminFilterChip options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />

      {loading ? (
        <AdminEmptyState loading />
      ) : reports.length === 0 ? (
        <AdminEmptyState title="Şikayet yok" message="Seçili filtreye uygun şikayet bulunamadı." icon="flag-outline" />
      ) : (
        reports.map((report) => {
          const isUrgent = report.reason === 'child_safety';
          return (
            <GlassCard
              key={report.id}
              style={[styles.card, isUrgent && { borderColor: colors.danger, borderWidth: 1.5 }]}
            >
              {isUrgent ? (
                <Text style={{ color: colors.danger }} variant="caption">
                  ACİL — Çocuk Güvenliği
                </Text>
              ) : null}
              <Text variant="label">{REPORT_REASON_LABELS[report.reason] ?? report.reason}</Text>
              <Text secondary variant="caption">
                {report.target_type} · {report.reporter_id.slice(0, 8)}
              </Text>
              <Text secondary variant="caption">
                {REPORT_STATUS_LABELS[report.status]} · {new Date(report.created_at).toLocaleString('tr-TR')}
              </Text>
              {report.details ? <Text variant="caption">{report.details}</Text> : null}

              {report.status === 'pending' ? (
                <View style={styles.actions}>
                  <AdminActionChip label="İncele" icon="eye-outline" tone="primary" onPress={() => handleAssign(report.id)} />
                  <AdminActionChip
                    label="Onayla"
                    icon="checkmark-circle-outline"
                    tone="success"
                    onPress={() => handleResolve(report, 'approved', 'remove')}
                  />
                  <AdminActionChip
                    label="Reddet"
                    icon="close-circle-outline"
                    tone="danger"
                    onPress={() => handleResolve(report, 'rejected')}
                  />
                </View>
              ) : null}

              {report.status === 'reviewing' ? (
                <View style={styles.actions}>
                  <AdminActionChip label="Uyarı" icon="alert-circle-outline" tone="warning" onPress={() => handleResolve(report, 'approved', 'warn')} />
                  <AdminActionChip label="Gizle" icon="eye-off-outline" onPress={() => handleResolve(report, 'approved', 'hide')} />
                  <AdminActionChip label="Kaldır" icon="trash-outline" tone="danger" onPress={() => handleResolve(report, 'approved', 'remove')} />
                </View>
              ) : null}
            </GlassCard>
          );
        })
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
});
