import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  fetchUserSessions,
  fetchUserWarnings,
  revokeUserSession,
  type UserSessionRow,
  type UserWarningRow,
} from '@/features/admin/services/phase2Management';
import { spacing } from '@/constants/theme';

type Tab = 'sessions' | 'warnings';

const TABS = [
  { id: 'sessions' as const, label: 'Oturumlar' },
  { id: 'warnings' as const, label: 'Uyarılar' },
];

export function AdminSecurityScreen() {
  const [tab, setTab] = useState<Tab>('sessions');
  const [sessions, setSessions] = useState<UserSessionRow[]>([]);
  const [warnings, setWarnings] = useState<UserWarningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    if (tab === 'sessions') setSessions(await fetchUserSessions());
    else setWarnings(await fetchUserWarnings());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [tab]);

  const handleRevoke = (session: UserSessionRow) => {
    Alert.alert('Oturumu sonlandır', `@${session.username} · ${session.device_name ?? 'Cihaz'}`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sonlandır',
        style: 'destructive',
        onPress: async () => {
          const { error } = await revokeUserSession(session.id);
          if (error) Alert.alert('Hata', error);
          else load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell title="Güvenlik" subtitle="Oturumlar ve uyarı geçmişi" requireAdmin refreshing={refreshing} onRefresh={() => load(true)}>
      <AdminFilterChip options={TABS} value={tab} onChange={setTab} />
      {loading ? <AdminEmptyState loading /> : tab === 'sessions' ? sessions.map((s) => (
        <GlassCard key={s.id} style={styles.row}>
          <Text variant="label">@{s.username}</Text>
          <Text secondary variant="caption">{s.device_name ?? s.device_type ?? '—'} · {s.ip_address ?? '—'}</Text>
          <Text secondary variant="caption">{new Date(s.last_active_at).toLocaleString('tr-TR')}{s.is_current ? ' · Aktif' : ''}</Text>
          <AdminActionChip label="Sonlandır" icon="log-out" tone="danger" onPress={() => handleRevoke(s)} />
        </GlassCard>
      )) : warnings.map((w) => (
        <GlassCard key={w.id} style={styles.row}>
          <Text variant="label">@{w.username}</Text>
          <Text secondary variant="caption">{w.level} · @{w.issued_by_username}</Text>
          <Text secondary variant="caption" numberOfLines={2}>{w.reason}</Text>
        </GlassCard>
      ))}
    </AdminShell>
  );
}

const styles = StyleSheet.create({ row: { gap: spacing.sm } });
