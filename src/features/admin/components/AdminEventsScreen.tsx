import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { EVENT_TICKET_STATUS_LABELS } from '@/features/admin/constants';
import {
  fetchAdminEvents,
  removeEvent,
  setEventPromotion,
  type AdminEventRow,
} from '@/features/admin/services/eventManagement';
import {
  fetchAdminEventCheckins,
  fetchAdminEventTickets,
  type AdminEventCheckinRow,
  type AdminEventTicketRow,
} from '@/features/events/services/adminEventTickets';
import { formatEventDate } from '@/features/events/constants';
import { spacing } from '@/constants/theme';

export function AdminEventsScreen() {
  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<AdminEventTicketRow[]>([]);
  const [checkins, setCheckins] = useState<AdminEventCheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setEvents(await fetchAdminEvents());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const loadEventOps = async (eventId: string) => {
    setSelectedId(eventId);
    const [ticketRows, checkinRows] = await Promise.all([
      fetchAdminEventTickets(eventId),
      fetchAdminEventCheckins(eventId),
    ]);
    setTickets(ticketRows);
    setCheckins(checkinRows);
  };

  const toggleFeatured = async (event: AdminEventRow, value: boolean) => {
    const { error } = await setEventPromotion(event.id, { isFeatured: value });
    if (error) Alert.alert('Hata', error);
    else void load(true);
  };

  const toggleSponsored = async (event: AdminEventRow, value: boolean) => {
    const { error } = await setEventPromotion(event.id, { isSponsored: value });
    if (error) Alert.alert('Hata', error);
    else void load(true);
  };

  const handleRemove = (event: AdminEventRow) => {
    Alert.alert('Etkinliği kaldır', `"${event.title}" kaldırılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: async () => { await removeEvent(event.id); void load(true); } },
    ]);
  };

  return (
    <AdminShell title="Etkinlik Yönetimi" subtitle="Bilet satışları, QR giriş kayıtları ve moderasyon" refreshing={refreshing} onRefresh={() => load(true)}>
      {loading ? (
        <AdminEmptyState loading />
      ) : events.length === 0 ? (
        <AdminEmptyState title="Etkinlik yok" message="Yönetilecek etkinlik bulunamadı." icon="calendar-outline" />
      ) : (
        events.map((event) => (
          <GlassCard key={event.id} style={styles.row}>
            <Text variant="label">{event.title}</Text>
            <Text secondary variant="caption" numberOfLines={2}>{event.description}</Text>
            <Text secondary variant="caption">
              {formatEventDate(event.starts_at)} · {event.region_id} · {event.going_count} katılımcı
            </Text>
            <Text secondary variant="caption">
              {event.ticket_type === 'paid'
                ? `Ücretli · ${((event.ticket_price_cents ?? 0) / 100).toFixed(2)} TRY`
                : 'Ücretsiz'}
            </Text>
            <View style={styles.toggleRow}>
              <Text variant="caption">Öne çıkan</Text>
              <Switch value={event.is_featured} onValueChange={(v) => toggleFeatured(event, v)} />
            </View>
            <View style={styles.toggleRow}>
              <Text variant="caption">Sponsorlu</Text>
              <Switch value={event.is_sponsored} onValueChange={(v) => toggleSponsored(event, v)} />
            </View>
            <AdminActionChip
              label={selectedId === event.id ? 'Biletleri gizle' : 'Bilet ve girişleri göster'}
              icon="ticket-outline"
              tone="primary"
              onPress={() => (selectedId === event.id ? setSelectedId(null) : void loadEventOps(event.id))}
            />
            {selectedId === event.id ? (
              <View style={styles.ops}>
                <AdminSectionHeader title={`Satılan biletler (${tickets.length})`} />
                {tickets.length === 0 ? (
                  <Text secondary variant="caption">Henüz bilet satışı yok.</Text>
                ) : (
                  tickets.slice(0, 8).map((t) => (
                    <Text key={t.id} secondary variant="caption">
                      @{t.username} · {EVENT_TICKET_STATUS_LABELS[t.status] ?? t.status} · ₺
                      {(t.amount_cents / 100).toFixed(2)}
                    </Text>
                  ))
                )}
                <AdminSectionHeader title={`QR giriş kayıtları (${checkins.length})`} />
                {checkins.length === 0 ? (
                  <Text secondary variant="caption">Henüz giriş kaydı yok.</Text>
                ) : (
                  checkins.slice(0, 8).map((c) => (
                    <Text key={c.id} secondary variant="caption">
                      @{c.username} · Giriş: {new Date(c.checked_in_at).toLocaleString('tr-TR')}
                    </Text>
                  ))
                )}
              </View>
            ) : null}
            {event.status === 'published' ? (
              <AdminActionChip label="Etkinliği kaldır" icon="trash-outline" tone="danger" onPress={() => handleRemove(event)} />
            ) : (
              <Text secondary variant="caption">Durum: {event.status}</Text>
            )}
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ops: { gap: spacing.xs },
});
