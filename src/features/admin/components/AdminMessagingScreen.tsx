import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminMessagingContextSheet } from '@/features/admin/components/messaging/AdminMessagingContextSheet';
import { AdminMessagingReportCard } from '@/features/admin/components/messaging/AdminMessagingReportCard';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminNewDataAlert } from '@/features/admin/components/shared/AdminNewDataAlert';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import { AdminUserQuickSheet } from '@/features/admin/components/shared/AdminUserQuickSheet';
import { useAdminMessagingPoll } from '@/features/admin/hooks/useAdminMessagingPoll';
import {
  computeMessagingStats,
  filterMessagingReports,
  MESSAGING_STATUS_FILTERS,
  MESSAGING_TARGET_FILTERS,
  type MessagingStatusFilter,
  type MessagingTargetFilter,
} from '@/features/admin/services/messagingPresentation';
import {
  extractSubjectUserId,
  fetchMessagingContext,
  type MessagingContext,
  type MessagingReportRow,
} from '@/features/admin/services/messagingModeration';
import { lockConversation, platformMuteUser } from '@/features/admin/services/phase2Management';
import { assignReport, resolveReport } from '@/features/admin/services/reportQueue';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function InfoBanner() {
  const { colors } = useTheme();
  return (
    <GlassCard style={[styles.infoBanner, { borderColor: `${colors.primary}33` }]}>
      <View style={styles.infoRow}>
        <Ionicons name="chatbox-ellipses-outline" size={20} color={colors.primary} />
        <View style={styles.infoText}>
          <Text variant="label">Mesaj moderasyonu</Text>
          <Text secondary variant="caption">
            DM, grup sohbeti ve arama şikayetlerini filtreleyin, içeriği önizleyin ve aksiyon alın.
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

export function AdminMessagingScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items, loading, refreshing, error, newReportAlert, dismissAlert, refresh } = useAdminMessagingPoll();

  const [statusFilter, setStatusFilter] = useState<MessagingStatusFilter>('pending');
  const [targetFilter, setTargetFilter] = useState<MessagingTargetFilter>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [previewReport, setPreviewReport] = useState<MessagingReportRow | null>(null);
  const [previewContext, setPreviewContext] = useState<MessagingContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  const [userSheet, setUserSheet] = useState<{ userId: string; username: string } | null>(null);

  const stats = useMemo(() => computeMessagingStats(items), [items]);

  const filtered = useMemo(
    () => filterMessagingReports(items, search, statusFilter, targetFilter),
    [items, search, statusFilter, targetFilter],
  );

  const loadContext = useCallback(async (report: MessagingReportRow) => {
    setContextLoading(true);
    setContextError(null);
    setPreviewContext(null);

    const { data, error: ctxError } = await fetchMessagingContext(report.target_type, report.target_id);
    setPreviewContext(data);
    setContextError(ctxError);
    setContextLoading(false);
    return data;
  }, []);

  const handlePreview = useCallback(
    async (report: MessagingReportRow) => {
      setPreviewReport(report);
      await loadContext(report);
    },
    [loadContext],
  );

  const handleAssign = useCallback(
    async (report: MessagingReportRow) => {
      if (!user) return;
      setBusyId(report.id);
      const { error: assignError } = await assignReport(report.id, user.id);
      setBusyId(null);
      if (assignError) Alert.alert('Hata', assignError);
      else {
        refresh();
        if (previewReport?.id === report.id) {
          setPreviewReport({ ...report, status: 'reviewing', assigned_to: user.id });
        }
      }
    },
    [user, refresh, previewReport],
  );

  const handleResolve = useCallback(
    (report: MessagingReportRow, action: 'approve' | 'reject' | 'warn' | 'hide' | 'remove') => {
      const labels = {
        approve: 'Şikayeti onayla (içerik ihlali)',
        reject: 'Şikayeti reddet',
        warn: 'Kullanıcıya uyarı gönder',
        hide: 'İçeriği gizle',
        remove: 'İçeriği kaldır',
      };

      Alert.alert('Moderasyon', `${labels[action]} işlemi uygulansın mı?`, [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Uygula',
          style: action === 'reject' ? 'default' : 'destructive',
          onPress: async () => {
            setBusyId(report.id);
            const status = action === 'reject' ? 'rejected' : 'approved';
            const modAction =
              action === 'warn' ? 'warn' : action === 'hide' ? 'hide' : action === 'remove' ? 'remove' : undefined;
            const { error: resolveError } = await resolveReport(report.id, status, 'Mesaj moderasyonu', modAction);
            setBusyId(null);
            if (resolveError) Alert.alert('Hata', resolveError);
            else {
              setPreviewReport(null);
              setPreviewContext(null);
              refresh();
            }
          },
        },
      ]);
    },
    [refresh],
  );

  const handleLock = useCallback(
    (report: MessagingReportRow) => {
      if (report.target_type !== 'conversation') {
        Alert.alert('Bilgi', 'Sohbet kilidi yalnızca sohbet şikayetlerinde uygulanabilir.');
        return;
      }
      Alert.alert('Sohbeti kilitle', 'Bu sohbet kilitlensin mi?', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kilitle',
          style: 'destructive',
          onPress: async () => {
            setBusyId(report.id);
            const { error: lockError } = await lockConversation(report.target_id, true, 'Admin moderasyon');
            setBusyId(null);
            if (lockError) Alert.alert('Hata', lockError);
            else {
              Alert.alert('Tamam', 'Sohbet kilitlendi.');
              if (previewReport?.id === report.id) void loadContext(report);
              refresh();
            }
          },
        },
      ]);
    },
    [previewReport, loadContext, refresh],
  );

  const handleMute = useCallback(
    async (report: MessagingReportRow) => {
      let ctx = previewReport?.id === report.id ? previewContext : null;
      if (!ctx) {
        ctx = await loadContext(report);
      }

      const subject = extractSubjectUserId(report, ctx);
      if (!subject) {
        Alert.alert('Bilgi', 'Susturulacak kullanıcı bulunamadı. Önce detayı görüntüleyin.');
        return;
      }

      Alert.alert('24 saat sustur', `@${subject.username} mesajlaşmadan susturulsun mu?`, [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sustur',
          onPress: async () => {
            setBusyId(report.id);
            const { error: muteError } = await platformMuteUser(subject.userId, 24, 'Mesaj moderasyonu');
            setBusyId(null);
            if (muteError) Alert.alert('Hata', muteError);
            else Alert.alert('Tamam', `@${subject.username} susturuldu.`);
          },
        },
      ]);
    },
    [previewReport, previewContext, loadContext],
  );

  const closePreview = useCallback(() => {
    setPreviewReport(null);
    setPreviewContext(null);
    setContextError(null);
    setContextLoading(false);
  }, []);

  return (
    <AdminShell
      title="Mesaj Moderasyonu"
      subtitle="DM, grup ve arama şikayetleri"
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <InfoBanner />

      {newReportAlert ? (
        <AdminNewDataAlert message={newReportAlert} onDismiss={dismissAlert} />
      ) : null}

      <View style={styles.statsRow}>
        <AdminStatCard
          label="Bekleyen"
          value={stats.pending}
          icon="time-outline"
          accent={colors.warning}
          onPress={() => setStatusFilter('pending')}
        />
        <AdminStatCard
          label="İnceleniyor"
          value={stats.reviewing}
          icon="eye-outline"
          accent={colors.primary}
          onPress={() => setStatusFilter('reviewing')}
        />
        <AdminStatCard
          label="Acil"
          value={stats.urgent}
          icon="alert-circle-outline"
          accent={colors.danger}
        />
        <AdminStatCard
          label="Toplam"
          value={stats.total}
          icon="layers-outline"
          onPress={() => setStatusFilter('all')}
        />
      </View>

      <AdminSectionHeader title="Filtreler" />
      <AdminSearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Kullanıcı, sebep veya detay ara…"
      />
      <AdminFilterChip options={MESSAGING_STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
      <AdminFilterChip options={MESSAGING_TARGET_FILTERS} value={targetFilter} onChange={setTargetFilter} />

      <AdminSectionHeader
        title="Şikayetler"
        hint={`${filtered.length} kayıt · Mesaj ${stats.byTarget.message} · Sohbet ${stats.byTarget.conversation} · Arama ${stats.byTarget.call}`}
      />

      {loading ? (
        <AdminEmptyState loading />
      ) : error ? (
        <AdminEmptyState title="Veri yüklenemedi" message={error} icon="cloud-offline-outline" />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          title="Şikayet yok"
          message="Seçili filtreye uygun mesajlaşma şikayeti bulunamadı."
          icon="chatbubbles-outline"
        />
      ) : (
        filtered.map((report) => (
          <AdminMessagingReportCard
            key={report.id}
            report={report}
            busy={busyId === report.id}
            onPreview={handlePreview}
            onAssign={handleAssign}
            onResolve={handleResolve}
            onLock={handleLock}
            onMute={handleMute}
          />
        ))
      )}

      <AdminMessagingContextSheet
        report={previewReport}
        context={previewContext}
        contextLoading={contextLoading}
        contextError={contextError}
        busy={previewReport ? busyId === previewReport.id : false}
        onClose={closePreview}
        onOpenUser={(userId, username) => setUserSheet({ userId, username })}
        onAssign={handleAssign}
        onResolve={handleResolve}
        onLock={handleLock}
        onMute={handleMute}
      />

      <AdminUserQuickSheet
        visible={!!userSheet}
        onClose={() => setUserSheet(null)}
        userId={userSheet?.userId ?? ''}
        username={userSheet?.username ?? ''}
        onActionComplete={refresh}
      />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  infoBanner: { gap: spacing.sm },
  infoRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  infoText: { flex: 1, gap: 4 },
  statsRow: { gap: spacing.sm },
});
