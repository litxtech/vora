import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { fetchDailyTasks, updateDailyTask, type DailyTaskRow } from '@/features/admin/services/phase2Management';
import { createDailyTask } from '@/features/tasks/services/adminTasks';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const EMPTY_FORM = {
  key: '',
  title: '',
  description: '',
  target_count: '1',
  reward_value: '10',
  reward_type: 'kuru' as const,
};

export function AdminTasksScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<DailyTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [showCreate, setShowCreate] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchDailyTasks());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleActive = (item: DailyTaskRow) => {
    Alert.alert(item.is_active ? 'Pasifleştir' : 'Aktifleştir', item.title, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          const { error } = await updateDailyTask({ ...item, is_active: !item.is_active });
          if (error) Alert.alert('Hata', error);
          else void load(true);
        },
      },
    ]);
  };

  const startEdit = (item: DailyTaskRow) => {
    setEditingKey(item.key);
    setEditForm({
      key: item.key,
      title: item.title,
      description: item.description,
      target_count: String(item.target_count),
      reward_value: String(item.reward_value),
      reward_type: (item.reward_type as 'kuru') ?? 'kuru',
    });
  };

  const saveEdit = async () => {
    if (!editingKey) return;
    const { error } = await updateDailyTask({
      key: editingKey,
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      target_count: Number(editForm.target_count) || 1,
      reward_value: Number(editForm.reward_value) || 0,
      is_active: items.find((i) => i.key === editingKey)?.is_active ?? true,
    });
    if (error) Alert.alert('Hata', error);
    else {
      setEditingKey(null);
      void load(true);
    }
  };

  const handleCreate = async () => {
    if (!createForm.key.trim() || !createForm.title.trim()) {
      Alert.alert('Eksik bilgi', 'Görev kodu ve başlık yazmalısınız.');
      return;
    }
    const { error } = await createDailyTask({
      key: createForm.key.trim(),
      title: createForm.title.trim(),
      description: createForm.description.trim(),
      target_count: Number(createForm.target_count) || 1,
      reward_type: createForm.reward_type,
      reward_value: Number(createForm.reward_value) || 0,
    });
    if (error) Alert.alert('Hata', error);
    else {
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      void load(true);
    }
  };

  return (
    <AdminShell
      title="Günlük Görevler"
      subtitle="Görev tanımları ve ödüller"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <Button title={showCreate ? 'Formu gizle' : 'Yeni görev ekle'} onPress={() => setShowCreate((v) => !v)} />

      {showCreate ? (
        <GlassCard style={styles.form}>
          <AdminSectionHeader title="Yeni görev" />
          <AdminFormField placeholder="Görev kodu (ör. gunluk_gonderi_3)" value={createForm.key} onChangeText={(v) => setCreateForm((f) => ({ ...f, key: v }))} />
          <AdminFormField placeholder="Görev başlığı" value={createForm.title} onChangeText={(v) => setCreateForm((f) => ({ ...f, title: v }))} />
          <AdminFormField placeholder="Görev açıklaması" value={createForm.description} onChangeText={(v) => setCreateForm((f) => ({ ...f, description: v }))} multiline />
          <AdminFormField placeholder="Tamamlanması gereken adet" value={createForm.target_count} onChangeText={(v) => setCreateForm((f) => ({ ...f, target_count: v }))} />
          <AdminFormField placeholder="Ödül miktarı" value={createForm.reward_value} onChangeText={(v) => setCreateForm((f) => ({ ...f, reward_value: v }))} />
          <Button title="Görevi oluştur" onPress={handleCreate} />
        </GlassCard>
      ) : null}

      {loading ? (
        <AdminEmptyState loading />
      ) : (
        items.map((item) => (
          <GlassCard key={item.key} style={styles.row}>
            {editingKey === item.key ? (
              <>
                <AdminFormField value={editForm.title} onChangeText={(v) => setEditForm((f) => ({ ...f, title: v }))} />
                <AdminFormField value={editForm.description} onChangeText={(v) => setEditForm((f) => ({ ...f, description: v }))} multiline />
                <AdminFormField value={editForm.target_count} onChangeText={(v) => setEditForm((f) => ({ ...f, target_count: v }))} keyboardType="number-pad" />
                <AdminFormField value={editForm.reward_value} onChangeText={(v) => setEditForm((f) => ({ ...f, reward_value: v }))} keyboardType="number-pad" />
                <View style={styles.editActions}>
                  <Button title="Kaydet" onPress={saveEdit} />
                  <Button title="Vazgeç" variant="secondary" onPress={() => setEditingKey(null)} />
                </View>
              </>
            ) : (
              <>
                <Text variant="label">{item.title}</Text>
                <Text secondary variant="caption">{item.description}</Text>
                <Text secondary variant="caption">
                  {item.key} · Hedef: {item.target_count} · Ödül: {item.reward_value} {item.reward_type}
                </Text>
                <View style={styles.switchRow}>
                  <Text variant="caption">{item.is_active ? 'Yayında' : 'Kapalı'}</Text>
                  <Switch value={item.is_active} onValueChange={() => toggleActive(item)} trackColor={{ true: colors.primary }} />
                </View>
                <Button title="Görevi düzenle" variant="secondary" onPress={() => startEdit(item)} />
              </>
            )}
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  form: { gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editActions: { gap: spacing.sm },
});
