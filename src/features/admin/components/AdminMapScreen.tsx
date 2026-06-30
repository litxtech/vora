import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { KARADENIZ_INITIAL_REGION } from '@/features/map/constants';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { fetchAdminIncidents, removeIncident, updateIncident } from '@/features/admin/services/mapManagement';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

const STATUS_FILTERS = [
  { id: 'all' as const, label: 'Tümü' },
  { id: 'open' as const, label: 'Açık' },
  { id: 'verified' as const, label: 'Doğrulanmış' },
  { id: 'resolved' as const, label: 'Çözüldü' },
  { id: 'dismissed' as const, label: 'Reddedildi' },
];

export function AdminMapScreen() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [incidents, setIncidents] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const mapMarkers = useMemo(
    () =>
      incidents.filter(
        (inc) => inc.latitude != null && inc.longitude != null,
      ) as Array<Record<string, unknown> & { latitude: number; longitude: number }>,
    [incidents],
  );

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const { data } = await fetchAdminIncidents(statusFilter === 'all' ? null : statusFilter);
    setIncidents(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, [statusFilter]);

  const handleDismiss = (id: string) => {
    if (!user) return;
    Alert.alert('Olayı kaldır', 'Haritadan kaldırılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: async () => { await removeIncident(id, user.id); void load(true); } },
    ]);
  };

  const handleResolve = async (id: string) => {
    await updateIncident(id, { status: 'resolved' });
    void load(true);
  };

  return (
    <AdminShell title="Harita Yönetimi" subtitle="Olay haritası ve moderasyon" refreshing={refreshing} onRefresh={() => load(true)}>
      <AdminFilterChip options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />

      {mapMarkers.length > 0 ? (
        <View style={styles.mapWrap}>
          <MapView style={styles.map} initialRegion={KARADENIZ_INITIAL_REGION}>
            {mapMarkers.map((inc) => (
              <Marker
                key={inc.id as string}
                coordinate={{ latitude: inc.latitude, longitude: inc.longitude }}
                title={inc.title as string}
                description={inc.severity as string}
              />
            ))}
          </MapView>
        </View>
      ) : null}

      {loading ? (
        <AdminEmptyState loading />
      ) : incidents.length === 0 ? (
        <AdminEmptyState title="Olay yok" message="Haritada yönetilecek olay bulunamadı." icon="map-outline" />
      ) : (
        incidents.map((inc) => (
          <GlassCard key={inc.id as string} style={styles.row}>
            <Text variant="label">{inc.title as string}</Text>
            <Text secondary variant="caption" numberOfLines={2}>{inc.description as string}</Text>
            <Text secondary variant="caption">
              {inc.severity as string} · {inc.status as string}
              {inc.latitude != null ? ` · ${(inc.latitude as number).toFixed(4)}, ${(inc.longitude as number).toFixed(4)}` : ''}
            </Text>
            <View style={styles.actions}>
              <AdminActionChip label="Çözüldü olarak işaretle" icon="checkmark-circle-outline" tone="success" onPress={() => handleResolve(inc.id as string)} />
              <AdminActionChip label="Haritadan kaldır" icon="trash-outline" tone="danger" onPress={() => handleDismiss(inc.id as string)} />
            </View>
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  mapWrap: { height: 220, borderRadius: 12, overflow: 'hidden' },
  map: { flex: 1 },
  row: { gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
