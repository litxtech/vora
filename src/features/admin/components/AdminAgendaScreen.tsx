import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  deleteDailyAgenda,
  fetchDailyAgenda,
  upsertDailyAgenda,
  type DailyAgendaRow,
} from '@/features/admin/services/phase3Management';
import { spacing } from '@/constants/theme';

export function AdminAgendaScreen() {
  const [items, setItems] = useState<DailyAgendaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [tag, setTag] = useState('');
  const [label, setLabel] = useState('');
  const [regionId, setRegionId] = useState('');
  const [priority, setPriority] = useState('50');
  const [saving, setSaving] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchDailyAgenda());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async () => {
    if (!tag.trim() || !label.trim()) {
      Alert.alert('Eksik bilgi', 'Etiket ve başlık zorunludur.');
      return;
    }
    setSaving(true);
    const { error } = await upsertDailyAgenda({
      tag: tag.trim(),
      label: label.trim(),
      regionId: regionId.trim() || undefined,
      priority: Number(priority) || 0,
    });
    setSaving(false);
    if (error) Alert.alert('Hata', error);
    else {
      setTag('');
      setLabel('');
      setRegionId('');
      setPriority('50');
      await load(true);
    }
  };

  const handleDelete = (item: DailyAgendaRow) => {
    Alert.alert('Sil', `${item.label} gündemden kaldırılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setActionId(item.id);
          const { error } = await deleteDailyAgenda(item.id);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Gündem Yönetimi"
      subtitle="Günlük gündem konuları"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminSectionHeader title="Yeni gündem konusu" />
      <GlassCard style={styles.form}>
        <AdminFormField label="Etiket (tag)" placeholder="trabzonspor" value={tag} onChangeText={setTag} />
        <AdminFormField label="Başlık" placeholder="#Trabzonspor" value={label} onChangeText={setLabel} />
        <AdminFormField label="Bölge (opsiyonel)" placeholder="trabzon" value={regionId} onChangeText={setRegionId} />
        <AdminFormField label="Öncelik" placeholder="50" value={priority} onChangeText={setPriority} />
        <AdminActionChip label="Ekle" icon="add-outline" tone="primary" onPress={handleCreate} loading={saving} />
      </GlassCard>

      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState title="Gündem yok" message="Gündem konusu bulunamadı." icon="calendar-outline" />
      ) : (
        items.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text variant="label">{item.label}</Text>
            <Text secondary variant="caption">
              {item.tag} · {item.scope}
              {item.region_id ? ` · ${item.region_id}` : ''} · öncelik {item.priority}
            </Text>
            <Text secondary variant="caption">
              {item.agenda_date} · {item.is_manual ? 'Manuel' : 'Otomatik'}
            </Text>
            <View style={styles.actions}>
              <AdminActionChip
                label="Sil"
                icon="trash-outline"
                tone="danger"
                loading={actionId === item.id}
                disabled={Boolean(actionId)}
                onPress={() => handleDelete(item)}
              />
            </View>
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm, marginBottom: spacing.md },
  row: { gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
