import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  adminCancelAccountLinkRequest,
  adminForceUnlinkAccounts,
  fetchAdminAccountLinkRequests,
  fetchAdminLinkedAccounts,
  type AdminAccountLinkRequestRow,
  type AdminLinkedAccountRow,
} from '@/features/account-switch/services/adminAccountLinks';
import { spacing } from '@/constants/theme';

type Tab = 'requests' | 'linked';

const TABS = [
  { id: 'requests' as const, label: 'Bağlama istekleri' },
  { id: 'linked' as const, label: 'Aktif bağlantılar' },
];

const REQUEST_FILTERS = [
  { id: 'pending', label: 'Bekleyen' },
  { id: 'accepted', label: 'Onaylanan' },
  { id: 'declined', label: 'Reddedilen' },
  { id: 'all', label: 'Tümü' },
];

export function AdminAccountLinksScreen() {
  const [tab, setTab] = useState<Tab>('requests');
  const [requestFilter, setRequestFilter] = useState('pending');
  const [requests, setRequests] = useState<AdminAccountLinkRequestRow[]>([]);
  const [linked, setLinked] = useState<AdminLinkedAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    if (tab === 'requests') {
      setRequests(await fetchAdminAccountLinkRequests(requestFilter));
    } else {
      setLinked(await fetchAdminLinkedAccounts());
    }

    setLoading(false);
    setRefreshing(false);
  }, [tab, requestFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancelRequest = (item: AdminAccountLinkRequestRow) => {
    Alert.alert(
      'İsteği iptal et',
      `@${item.requester_username} → @${item.target_username}`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal et',
          style: 'destructive',
          onPress: async () => {
            setActionId(item.id);
            const { error } = await adminCancelAccountLinkRequest(item.id);
            setActionId(null);
            if (error) Alert.alert('Hata', error);
            else await load(true);
          },
        },
      ],
    );
  };

  const unlinkAccounts = (item: AdminLinkedAccountRow) => {
    Alert.alert(
      'Bağlantıyı kes',
      `@${item.personal_username} ↔ @${item.business_username}`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kes',
          style: 'destructive',
          onPress: async () => {
            setActionId(item.id);
            const { error } = await adminForceUnlinkAccounts(item.id);
            setActionId(null);
            if (error) Alert.alert('Hata', error);
            else await load(true);
          },
        },
      ],
    );
  };

  return (
    <AdminShell
      title="Hesap Bağlama"
      subtitle="Bireysel ↔ işletme bağlantı istekleri ve aktif eşleşmeler"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminFilterChip options={TABS} value={tab} onChange={setTab} />

      {tab === 'requests' ? (
        <AdminFilterChip options={REQUEST_FILTERS} value={requestFilter} onChange={setRequestFilter} />
      ) : null}

      {loading ? (
        <AdminEmptyState loading />
      ) : tab === 'requests' ? (
        requests.length === 0 ? (
          <AdminEmptyState title="Kayıt yok" message="Bağlama isteği bulunamadı." icon="link-outline" />
        ) : (
          requests.map((item) => (
            <GlassCard key={item.id} style={styles.card}>
              <Text variant="label">
                @{item.requester_username} → @{item.target_username}
              </Text>
              <Text variant="caption" muted>
                Durum: {item.status} · {new Date(item.created_at).toLocaleString('tr-TR')}
              </Text>
              <View style={styles.actions}>
                <AdminActionChip
                  label="Talep eden"
                  icon="person-outline"
                  onPress={() => router.push(`/admin/users/${item.requester_id}` as Href)}
                />
                <AdminActionChip
                  label="Hedef"
                  icon="person-outline"
                  onPress={() => router.push(`/admin/users/${item.target_user_id}` as Href)}
                />
                {item.status === 'pending' ? (
                  <AdminActionChip
                    label={actionId === item.id ? '...' : 'İptal et'}
                    icon="close-circle-outline"
                    tone="danger"
                    onPress={() => cancelRequest(item)}
                  />
                ) : null}
              </View>
            </GlassCard>
          ))
        )
      ) : linked.length === 0 ? (
        <AdminEmptyState title="Bağlantı yok" message="Aktif hesap bağlantısı bulunamadı." icon="link-outline" />
      ) : (
        linked.map((item) => (
          <GlassCard key={item.id} style={styles.card}>
            <Text variant="label">
              @{item.personal_username} ↔ @{item.business_username}
            </Text>
            <Text variant="caption" muted>
              {new Date(item.linked_at).toLocaleString('tr-TR')}
            </Text>
            <View style={styles.actions}>
              <AdminActionChip
                label="Bireysel"
                icon="person-outline"
                onPress={() => router.push(`/admin/users/${item.personal_user_id}` as Href)}
              />
              <AdminActionChip
                label="İşletme"
                icon="business-outline"
                onPress={() => router.push(`/admin/users/${item.business_user_id}` as Href)}
              />
              <AdminActionChip
                label={actionId === item.id ? '...' : 'Bağlantıyı kes'}
                icon="unlink-outline"
                tone="danger"
                onPress={() => unlinkAccounts(item)}
              />
            </View>
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
});
