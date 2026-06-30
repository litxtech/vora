import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminNewDataAlert } from '@/features/admin/components/shared/AdminNewDataAlert';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import { AdminUserQuickSheet } from '@/features/admin/components/shared/AdminUserQuickSheet';
import { useAdminCallSessionsLive } from '@/features/admin/hooks/useAdminCallSessionsLive';
import { platformMuteUser } from '@/features/admin/services/phase2Management';
import {
  terminateAllLiveCallSessions,
  terminateCallSession,
  type CallSessionRow,
} from '@/features/admin/services/phase3Management';
import { useCallDuration } from '@/features/calls/hooks/useCallDuration';
import { formatCallDuration } from '@/features/calls/utils';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type StatusFilter = 'all' | 'live' | 'ringing' | 'history';

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'live', label: 'Canlı' },
  { id: 'ringing', label: 'Çalıyor' },
  { id: 'history', label: 'Geçmiş' },
];

const STATUS_LABELS: Record<string, string> = {
  ringing: 'Çalıyor',
  accepted: 'Aktif',
  declined: 'Reddedildi',
  ended: 'Bitti',
  missed: 'Cevapsız',
  cancelled: 'İptal',
};

const TYPE_LABELS: Record<string, string> = {
  audio: 'Sesli',
  video: 'Görüntülü',
};

function isLiveStatus(status: string) {
  return status === 'ringing' || status === 'accepted';
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  return new Date(iso).toLocaleString('tr-TR');
}

function formatSessionDuration(item: CallSessionRow, liveSeconds?: number): string | null {
  if (item.status === 'accepted' && item.started_at && liveSeconds != null) {
    return formatCallDuration(liveSeconds);
  }
  if (item.started_at && item.ended_at) {
    const seconds = Math.max(
      0,
      Math.floor((new Date(item.ended_at).getTime() - new Date(item.started_at).getTime()) / 1000),
    );
    return formatCallDuration(seconds);
  }
  return null;
}

function matchesSearch(item: CallSessionRow, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.caller_username.toLowerCase().includes(q) ||
    item.callee_username.toLowerCase().includes(q) ||
    item.channel_name.toLowerCase().includes(q)
  );
}

function matchesFilter(item: CallSessionRow, filter: StatusFilter) {
  if (filter === 'all') return true;
  if (filter === 'live') return isLiveStatus(item.status);
  if (filter === 'ringing') return item.status === 'ringing';
  return !isLiveStatus(item.status);
}

function statusTone(status: string): 'danger' | 'warning' | 'success' | 'default' {
  if (status === 'ringing') return 'warning';
  if (status === 'accepted') return 'success';
  if (status === 'missed' || status === 'declined') return 'danger';
  return 'default';
}

type CallSessionCardProps = {
  item: CallSessionRow;
  actionId: string | null;
  onTerminate: (item: CallSessionRow) => void;
  onOpenUser: (userId: string, username: string) => void;
  onMuteUser: (userId: string, username: string) => void;
};

function CallSessionCard({ item, actionId, onTerminate, onOpenUser, onMuteUser }: CallSessionCardProps) {
  const { colors } = useTheme();
  const live = isLiveStatus(item.status);
  const liveSeconds = useCallDuration(item.started_at, item.status === 'accepted');
  const duration = formatSessionDuration(item, liveSeconds);
  const tone = statusTone(item.status);
  const toneColor =
    tone === 'success'
      ? colors.success
      : tone === 'warning'
        ? colors.warning
        : tone === 'danger'
          ? colors.danger
          : colors.textMuted;

  return (
    <GlassCard
      style={[
        styles.card,
        live && { borderColor: `${toneColor}66`, borderWidth: 1.5 },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.participants}>
          {live ? <View style={[styles.liveDot, { backgroundColor: toneColor }]} /> : null}
          <Pressable onPress={() => onOpenUser(item.caller_id, item.caller_username)}>
            <Text variant="label" style={{ color: colors.primary }}>
              @{item.caller_username}
            </Text>
          </Pressable>
          <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
          <Pressable onPress={() => onOpenUser(item.callee_id, item.callee_username)}>
            <Text variant="label" style={{ color: colors.primary }}>
              @{item.callee_username}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${toneColor}18`, borderColor: `${toneColor}44` }]}>
          <Ionicons
            name={item.call_type === 'video' ? 'videocam' : 'call'}
            size={12}
            color={toneColor}
          />
          <Text variant="caption" style={{ color: toneColor, fontWeight: '700' }}>
            {live ? 'CANLI' : STATUS_LABELS[item.status] ?? item.status}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text secondary variant="caption">
          {TYPE_LABELS[item.call_type] ?? item.call_type}
        </Text>
        <Text secondary variant="caption">
          Başlangıç: {formatRelativeTime(item.created_at)}
        </Text>
      </View>

      <View style={styles.metaRow}>
        {item.started_at ? (
          <Text secondary variant="caption">
            Bağlandı: {new Date(item.started_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : (
          <Text secondary variant="caption">Henüz bağlanmadı</Text>
        )}
        {duration ? (
          <Text variant="caption" style={{ color: live ? colors.success : colors.textSecondary, fontWeight: '700' }}>
            Süre: {duration}
          </Text>
        ) : null}
      </View>

      {item.ended_at ? (
        <Text secondary variant="caption">
          Bitiş: {new Date(item.ended_at).toLocaleString('tr-TR')}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {live ? (
          <AdminActionChip
            label="Aramayı kes"
            icon="call-outline"
            tone="danger"
            loading={actionId === item.id}
            disabled={Boolean(actionId)}
            onPress={() => onTerminate(item)}
          />
        ) : null}
        <AdminActionChip
          label="Arayan"
          icon="person-outline"
          compact
          onPress={() => onOpenUser(item.caller_id, item.caller_username)}
        />
        <AdminActionChip
          label="Aranan"
          icon="person-outline"
          compact
          onPress={() => onOpenUser(item.callee_id, item.callee_username)}
        />
        <AdminActionChip
          label="Sustur (24s)"
          icon="volume-mute"
          tone="warning"
          compact
          disabled={Boolean(actionId)}
          onPress={() => onMuteUser(item.caller_id, item.caller_username)}
        />
      </View>
    </GlassCard>
  );
}

export function AdminCallsScreen() {
  const { colors } = useTheme();
  const { items, loading, refreshing, newLiveAlert, dismissAlert, refresh } = useAdminCallSessionsLive();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionId, setActionId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [quickUser, setQuickUser] = useState<{ id: string; username: string } | null>(null);

  const stats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    const live = items.filter((item) => isLiveStatus(item.status));
    const ringing = items.filter((item) => item.status === 'ringing');
    const today = items.filter((item) => new Date(item.created_at).getTime() >= todayMs);
    const endedToday = items.filter(
      (item) => item.ended_at && new Date(item.ended_at).getTime() >= todayMs,
    );

    return {
      liveCount: live.length,
      ringingCount: ringing.length,
      todayCount: today.length,
      endedTodayCount: endedToday.length,
    };
  }, [items]);

  const filtered = useMemo(
    () => items.filter((item) => matchesFilter(item, statusFilter) && matchesSearch(item, search)),
    [items, search, statusFilter],
  );

  const liveItems = useMemo(
    () => filtered.filter((item) => isLiveStatus(item.status)),
    [filtered],
  );

  const historyItems = useMemo(
    () => filtered.filter((item) => !isLiveStatus(item.status)),
    [filtered],
  );

  const handleTerminate = (item: CallSessionRow) => {
    Alert.alert(
      'Aramayı kes',
      `@${item.caller_username} ↔ @${item.callee_username} araması sonlandırılsın mı?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kes',
          style: 'destructive',
          onPress: async () => {
            setActionId(item.id);
            const { error } = await terminateCallSession(item.id);
            setActionId(null);
            if (error) Alert.alert('Hata', error);
            else await refresh();
          },
        },
      ],
    );
  };

  const handleTerminateAll = () => {
    if (stats.liveCount === 0) return;
    Alert.alert(
      'Tüm canlı aramaları kes',
      `${stats.liveCount} aktif arama sonlandırılacak. Emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Hepsini kes',
          style: 'destructive',
          onPress: async () => {
            setBulkBusy(true);
            const { count, error } = await terminateAllLiveCallSessions();
            setBulkBusy(false);
            if (error) Alert.alert('Hata', error);
            else {
              Alert.alert('Tamam', `${count} arama sonlandırıldı.`);
              await refresh();
            }
          },
        },
      ],
    );
  };

  const handleMuteUser = (userId: string, username: string) => {
    Alert.alert('24 saat sustur', `@${username} arama ve mesajlaşmadan susturulsun mu?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sustur',
        style: 'destructive',
        onPress: async () => {
          setActionId(userId);
          const { error } = await platformMuteUser(userId, 24, 'Arama moderasyonu');
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else Alert.alert('Tamam', `@${username} susturuldu.`);
        },
      },
    ]);
  };

  const handleOpenUser = (userId: string, username: string) => {
    setQuickUser({ id: userId, username });
  };

  return (
    <AdminShell
      title="Arama Moderasyonu"
      subtitle="Canlı arama izleme ve müdahale"
      badge={stats.liveCount > 0 ? `${stats.liveCount} canlı` : undefined}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <View style={styles.liveIndicator}>
        <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
        <Text secondary variant="caption">
          Canlı güncelleme aktif · {refreshing ? 'yenileniyor…' : 'izleniyor'}
        </Text>
      </View>

      {newLiveAlert ? (
        <AdminNewDataAlert message={newLiveAlert} tone="danger" onDismiss={dismissAlert} />
      ) : null}

      <View style={styles.statsRow}>
        <AdminStatCard
          label="Canlı"
          value={stats.liveCount}
          icon="radio-outline"
          accent={colors.danger}
          onPress={() => setStatusFilter('live')}
        />
        <AdminStatCard
          label="Çalıyor"
          value={stats.ringingCount}
          icon="call-outline"
          accent={colors.warning}
          onPress={() => setStatusFilter('ringing')}
        />
        <AdminStatCard
          label="Bugün"
          value={stats.todayCount}
          icon="today-outline"
          accent={colors.primary}
        />
        <AdminStatCard
          label="Biten"
          value={stats.endedTodayCount}
          icon="checkmark-done-outline"
          accent={colors.textMuted}
          onPress={() => setStatusFilter('history')}
        />
      </View>

      <AdminSearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Kullanıcı veya kanal ara…"
      />

      <AdminFilterChip options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />

      {stats.liveCount > 0 ? (
        <AdminActionChip
          label={bulkBusy ? 'Kesiliyor…' : `Tüm canlı aramaları kes (${stats.liveCount})`}
          icon="close-circle-outline"
          tone="danger"
          loading={bulkBusy}
          disabled={bulkBusy || Boolean(actionId)}
          onPress={handleTerminateAll}
        />
      ) : null}

      {loading ? (
        <AdminEmptyState loading />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          title="Arama bulunamadı"
          message={
            search || statusFilter !== 'all'
              ? 'Filtre veya arama kriterine uygun oturum yok.'
              : 'Henüz arama oturumu kaydı yok.'
          }
          icon="call-outline"
        />
      ) : (
        <>
          {liveItems.length > 0 ? (
            <>
              <AdminSectionHeader title="Canlı aramalar" hint={`${liveItems.length} oturum`} />
              {liveItems.map((item) => (
                <CallSessionCard
                  key={item.id}
                  item={item}
                  actionId={actionId}
                  onTerminate={handleTerminate}
                  onOpenUser={handleOpenUser}
                  onMuteUser={handleMuteUser}
                />
              ))}
            </>
          ) : null}

          {historyItems.length > 0 ? (
            <>
              <AdminSectionHeader title="Geçmiş aramalar" hint={`${historyItems.length} kayıt`} />
              {historyItems.map((item) => (
                <CallSessionCard
                  key={item.id}
                  item={item}
                  actionId={actionId}
                  onTerminate={handleTerminate}
                  onOpenUser={handleOpenUser}
                  onMuteUser={handleMuteUser}
                />
              ))}
            </>
          ) : null}
        </>
      )}

      <AdminUserQuickSheet
        visible={Boolean(quickUser)}
        onClose={() => setQuickUser(null)}
        userId={quickUser?.id ?? ''}
        username={quickUser?.username ?? ''}
        onActionComplete={refresh}
      />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  statsRow: {
    gap: spacing.sm,
  },
  card: {
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  participants: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
