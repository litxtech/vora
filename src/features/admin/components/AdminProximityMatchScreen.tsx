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
  adminClearProximityPresence,
  fetchAdminProximityInteractions,
  fetchAdminProximityPresence,
  type AdminProximityInteractionRow,
  type AdminProximityPresenceRow,
} from '@/features/proximity-match/services/adminProximityMatch';
import { spacing } from '@/constants/theme';

type Tab = 'presence' | 'interactions';

const TABS = [
  { id: 'presence' as const, label: 'Aktif konumlar' },
  { id: 'interactions' as const, label: 'Eşleşmeler' },
];

export function AdminProximityMatchScreen() {
  const [tab, setTab] = useState<Tab>('presence');
  const [presence, setPresence] = useState<AdminProximityPresenceRow[]>([]);
  const [interactions, setInteractions] = useState<AdminProximityInteractionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    if (tab === 'presence') {
      setPresence(await fetchAdminProximityPresence());
    } else {
      setInteractions(await fetchAdminProximityInteractions());
    }

    setLoading(false);
    setRefreshing(false);
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const clearPresence = (item: AdminProximityPresenceRow) => {
    Alert.alert('Konumu temizle', `@${item.username} yakınlık yayınını kaldır`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Temizle',
        style: 'destructive',
        onPress: async () => {
          setActionId(item.user_id);
          const { error } = await adminClearProximityPresence(item.user_id);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Yakınlık Eşleşmesi"
      subtitle="Konum yayını ve eşleşme etkileşimleri moderasyonu"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminFilterChip options={TABS} value={tab} onChange={setTab} />

      {loading ? (
        <AdminEmptyState loading />
      ) : tab === 'presence' ? (
        presence.length === 0 ? (
          <AdminEmptyState title="Aktif yayın yok" message="Şu an yakınlık konumu paylaşan kullanıcı yok." icon="location-outline" />
        ) : (
          presence.map((item) => (
            <GlassCard key={item.user_id} style={styles.card}>
              <Text variant="label">@{item.username}</Text>
              <Text variant="caption" muted>
                {item.region_id} · {new Date(item.updated_at).toLocaleString('tr-TR')}
              </Text>
              <View style={styles.actions}>
                <AdminActionChip
                  label="Profil"
                  icon="person-outline"
                  onPress={() => router.push(`/admin/users/${item.user_id}` as Href)}
                />
                <AdminActionChip
                  label={actionId === item.user_id ? '...' : 'Temizle'}
                  icon="trash-outline"
                  tone="danger"
                  onPress={() => clearPresence(item)}
                />
              </View>
            </GlassCard>
          ))
        )
      ) : interactions.length === 0 ? (
        <AdminEmptyState title="Etkileşim yok" message="Henüz eşleşme kaydı bulunamadı." icon="heart-outline" />
      ) : (
        interactions.map((item) => (
          <GlassCard key={`${item.user_low}-${item.user_high}`} style={styles.card}>
            <Text variant="label">
              @{item.user_low_username} ↔ @{item.user_high_username}
            </Text>
            <Text variant="caption" muted>
              {item.matched_at
                ? `Eşleşti: ${new Date(item.matched_at).toLocaleString('tr-TR')}`
                : `Karar: ${item.low_decision ?? '-'} / ${item.high_decision ?? '-'}`}
            </Text>
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
