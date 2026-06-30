import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  LIFECYCLE_REQUEST_STATUS_LABELS,
  LIFECYCLE_REQUEST_TYPE_LABELS,
  type LifecycleStatFilter,
  type LifecycleRequestType,
} from '@/features/account-lifecycle/constants';
import {
  fetchAccountLifecycleRequests,
  fetchAccountLifecycleStats,
  resolveLifecycleRequest,
  setLifecycleInProgress,
} from '@/features/account-lifecycle/services/adminLifecycle';
import type { AccountLifecycleRequestRow, AccountLifecycleStats } from '@/features/account-lifecycle/types';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminLifecycleListSheet } from '@/features/admin/components/AdminLifecycleListSheet';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import { ACCOUNT_STATUS_LABELS } from '@/features/moderation/constants';
import { formatDeletedAccountDate } from '@/features/account-deletion/utils';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';

const STATUS_FILTERS = [
  { id: 'pending' as const, label: 'Bekleyen' },
  { id: 'all' as const, label: 'Tümü' },
];

const STAT_ITEMS: {
  label: string;
  key: LifecycleStatFilter;
  icon: keyof typeof Ionicons.glyphMap;
  accentKey?: 'success' | 'primary' | 'warning' | 'danger';
}[] = [
  { label: 'Toplam hesap', key: 'total_accounts', icon: 'people' },
  { label: 'Aktif', key: 'active_accounts', icon: 'checkmark-circle', accentKey: 'success' },
  { label: 'Dondurulmuş', key: 'frozen_accounts', icon: 'snow', accentKey: 'primary' },
  { label: 'Silme bekleyen', key: 'deletion_pending_accounts', icon: 'time', accentKey: 'warning' },
  { label: 'Silinmiş', key: 'deleted_accounts', icon: 'trash', accentKey: 'danger' },
  { label: 'Bu ay açılan', key: 'opened_this_month', icon: 'person-add' },
  { label: 'Bu ay silinen', key: 'deleted_this_month', icon: 'close-circle', accentKey: 'danger' },
  { label: 'Bekleyen talep', key: 'pending_requests', icon: 'mail', accentKey: 'warning' },
];

const REQUEST_TYPE_ICONS: Record<LifecycleRequestType, keyof typeof Ionicons.glyphMap> = {
  reactivate: 'refresh-outline',
  cancel_deletion: 'arrow-undo-outline',
  restore_access: 'key-outline',
  general: 'chatbubble-ellipses-outline',
};

function resolveStatusTone(status: string): 'warning' | 'success' | 'danger' | 'primary' | 'default' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'in_progress':
      return 'primary';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    default:
      return 'default';
  }
}

type LifecycleRequestCardProps = {
  request: AccountLifecycleRequestRow;
  onResolve: (
    request: AccountLifecycleRequestRow,
    status: 'approved' | 'rejected',
    applyAction?: 'none' | 'reactivate' | 'cancel_deletion',
  ) => void;
  onInProgress: (request: AccountLifecycleRequestRow) => void;
};

function LifecycleRequestCard({ request, onResolve, onInProgress }: LifecycleRequestCardProps) {
  const { colors } = useTheme();
  const statusTone = resolveStatusTone(request.status);
  const statusColor =
    statusTone === 'warning'
      ? colors.warning
      : statusTone === 'success'
        ? colors.success
        : statusTone === 'danger'
          ? colors.danger
          : statusTone === 'primary'
            ? colors.primary
            : colors.textMuted;

  const showReactivate =
    request.request_type === 'reactivate' || request.current_account_status === 'frozen';
  const showCancelDeletion =
    request.request_type === 'cancel_deletion' || request.current_account_status === 'deletion_pending';

  const typeIcon = REQUEST_TYPE_ICONS[request.request_type];

  return (
    <GlassCard style={styles.card}>
      <Pressable
        style={styles.cardHeader}
        onPress={() => router.push(`/admin/users/${request.user_id}`)}
      >
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="person-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text variant="label">@{request.username}</Text>
          <Text secondary variant="caption" numberOfLines={1}>
            {request.full_name ?? '—'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}44` }]}>
          <Text variant="caption" style={{ color: statusColor, fontWeight: '700', fontSize: 11 }}>
            {LIFECYCLE_REQUEST_STATUS_LABELS[request.status]}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>

      <View style={[styles.typeBadge, { backgroundColor: `${colors.accent}12`, borderColor: `${colors.accent}33` }]}>
        <Ionicons name={typeIcon} size={13} color={colors.accent} />
        <Text variant="caption" style={{ color: colors.accent, fontWeight: '600' }}>
          {LIFECYCLE_REQUEST_TYPE_LABELS[request.request_type]}
        </Text>
      </View>

      <View style={styles.metaGrid}>
        <MetaItem icon="calendar-outline" label="Talep" value={formatDeletedAccountDate(request.created_at)} />
        <MetaItem icon="person-add-outline" label="Açılış" value={formatDeletedAccountDate(request.profile_created_at)} />
        <MetaItem
          icon="shield-outline"
          label="Durum"
          value={ACCOUNT_STATUS_LABELS[request.current_account_status] ?? request.current_account_status}
        />
        {request.deletion_requested_at ? (
          <MetaItem icon="time-outline" label="Silme" value={formatDeletedAccountDate(request.deletion_requested_at)} />
        ) : null}
        {request.deleted_at ? (
          <MetaItem icon="trash-outline" label="Silindi" value={formatDeletedAccountDate(request.deleted_at)} />
        ) : null}
      </View>

      <View style={[styles.messageBox, { backgroundColor: `${colors.primary}08`, borderColor: colors.border }]}>
        <Text variant="caption" muted style={styles.messageLabel}>
          Kullanıcı mesajı
        </Text>
        <Text variant="body">{request.message}</Text>
      </View>

      {request.status === 'pending' || request.status === 'in_progress' ? (
        <View style={[styles.actionsPanel, { borderTopColor: colors.border }]}>
          {request.status === 'pending' ? (
            <View style={styles.actionRow}>
              <AdminActionChip
                compact
                label="İşleme al"
                icon="hourglass-outline"
                tone="warning"
                style={styles.actionBtn}
                onPress={() => onInProgress(request)}
              />
            </View>
          ) : null}
          {showReactivate || showCancelDeletion ? (
            <View style={styles.actionRow}>
              {showReactivate ? (
                <AdminActionChip
                  compact
                  label="Aktif et"
                  icon="refresh-outline"
                  tone="success"
                  style={styles.actionBtn}
                  onPress={() => onResolve(request, 'approved', 'reactivate')}
                />
              ) : null}
              {showCancelDeletion ? (
                <AdminActionChip
                  compact
                  label="Silmeyi iptal"
                  icon="arrow-undo-outline"
                  tone="success"
                  style={styles.actionBtn}
                  onPress={() => onResolve(request, 'approved', 'cancel_deletion')}
                />
              ) : null}
            </View>
          ) : null}
          <View style={styles.actionRow}>
            <AdminActionChip
              compact
              label="Onayla"
              icon="checkmark-outline"
              tone="primary"
              style={styles.actionBtn}
              onPress={() => onResolve(request, 'approved')}
            />
            <AdminActionChip
              compact
              label="Reddet"
              icon="close-outline"
              tone="danger"
              style={styles.actionBtn}
              onPress={() => onResolve(request, 'rejected')}
            />
          </View>
        </View>
      ) : request.admin_note ? (
        <View style={[styles.adminNote, { backgroundColor: `${colors.textMuted}10`, borderColor: colors.border }]}>
          <Ionicons name="document-text-outline" size={14} color={colors.textMuted} />
          <Text variant="caption" secondary style={{ flex: 1 }}>
            {request.admin_note}
          </Text>
        </View>
      ) : null}
    </GlassCard>
  );
}

type MetaItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

function MetaItem({ icon, label, value }: MetaItemProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={12} color={colors.textMuted} />
      <View style={styles.metaCopy}>
        <Text variant="caption" muted style={styles.metaLabel}>
          {label}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export function AdminAccountLifecycleScreen() {
  const { colors } = useTheme();
  const guard = useAdminGuard();
  const [stats, setStats] = useState<AccountLifecycleStats | null>(null);
  const [requests, setRequests] = useState<AccountLifecycleRequestRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeStatFilter, setActiveStatFilter] = useState<LifecycleStatFilter | null>(null);

  const resolveAccent = (accentKey?: 'success' | 'primary' | 'warning' | 'danger') => {
    switch (accentKey) {
      case 'success':
        return colors.success;
      case 'primary':
        return colors.primary;
      case 'warning':
        return colors.warning;
      case 'danger':
        return colors.danger;
      default:
        return undefined;
    }
  };

  const load = useCallback(
    async (isRefresh = false) => {
      if (guard.status !== 'allowed') return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [statsResult, requestsResult] = await Promise.all([
        fetchAccountLifecycleStats(),
        fetchAccountLifecycleRequests(statusFilter),
      ]);

      setStats(statsResult.data);
      setRequests(requestsResult.data);
      setLoading(false);
      setRefreshing(false);
    },
    [guard.status, statusFilter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const handleResolve = (
    request: AccountLifecycleRequestRow,
    status: 'approved' | 'rejected',
    applyAction: 'none' | 'reactivate' | 'cancel_deletion' = 'none',
  ) => {
    const actionLabel =
      applyAction === 'reactivate'
        ? 'Hesap aktif edilecek'
        : applyAction === 'cancel_deletion'
          ? 'Silme talebi iptal edilecek'
          : 'Yalnızca talep kapatılacak';

    Alert.alert(
      status === 'approved' ? 'Talebi onayla' : 'Talebi reddet',
      actionLabel,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            const { error } = await resolveLifecycleRequest(request.id, status, '', applyAction);
            if (error) Alert.alert('Hata', error);
            else load(true);
          },
        },
      ],
    );
  };

  const handleInProgress = (request: AccountLifecycleRequestRow) => {
    Alert.alert('İşleme al', 'Kullanıcıya "Talebiniz inceleniyor" bildirimi gidecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          const { error } = await setLifecycleInProgress(request.id);
          if (error) Alert.alert('Hata', error);
          else load(true);
        },
      },
    ]);
  };

  const handleStatPress = (filter: LifecycleStatFilter) => {
    if (filter === 'pending_requests') {
      setStatusFilter('pending');
    }
    setActiveStatFilter(filter);
  };

  if (guard.status === 'denied') return null;

  return (
    <>
    <AdminShell
      title="Hesap Yaşam Döngüsü"
      subtitle="Açılış, silme, dondurma ve kullanıcı talepleri"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {stats ? (
        <>
          <AdminSectionHeader title="Özet" hint="Hesap durumları" />
          <View style={styles.statsGrid}>
            {STAT_ITEMS.map((item) => (
              <View key={item.key} style={styles.statCell}>
                <AdminStatCard
                  label={item.label}
                  value={String(stats[item.key])}
                  icon={item.icon}
                  accent={resolveAccent(item.accentKey)}
                  onPress={() => handleStatPress(item.key)}
                />
              </View>
            ))}
          </View>
        </>
      ) : null}

      <AdminSectionHeader
        title="Kullanıcı talepleri"
        hint={stats ? `${stats.pending_requests} bekleyen` : undefined}
      />
      <AdminFilterChip options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />

      {loading ? (
        <AdminEmptyState loading />
      ) : requests.length === 0 ? (
        <AdminEmptyState title="Talep yok" message="Seçili filtreye uygun hesap talebi bulunamadı." icon="mail-outline" />
      ) : (
        requests.map((request) => (
          <LifecycleRequestCard
            key={request.id}
            request={request}
            onResolve={handleResolve}
            onInProgress={handleInProgress}
          />
        ))
      )}
    </AdminShell>

    <AdminLifecycleListSheet
      visible={activeStatFilter !== null}
      filter={activeStatFilter}
      onClose={() => setActiveStatFilter(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCell: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: '47%',
  },
  card: {
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: '45%',
  },
  metaCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  metaLabel: {
    fontSize: 11,
  },
  messageBox: {
    gap: 4,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  messageLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  actionsPanel: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
  adminNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
});
