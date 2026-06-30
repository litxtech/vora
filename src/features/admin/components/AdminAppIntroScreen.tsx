import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  deleteAdminAppIntroSlide,
  fetchAdminAppIntroSlides,
  upsertAdminAppIntroSlide,
  type AdminAppIntroSlideRow,
} from '@/features/app-intro/services/adminAppIntro';
import { spacing } from '@/constants/theme';

export function AdminAppIntroScreen() {
  const [slides, setSlides] = useState<AdminAppIntroSlideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<AdminAppIntroSlideRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setSlides(await fetchAdminAppIntroSlides());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startNew = () => {
    setEditing({
      id: `slide-${Date.now()}`,
      icon: 'rocket',
      accent: '#E85D5D',
      title: '',
      subtitle: '',
      description: '',
      sort_order: slides.length + 1,
      is_active: true,
    });
  };

  const saveSlide = async () => {
    if (!editing?.title.trim()) {
      Alert.alert('Hata', 'Başlık zorunludur.');
      return;
    }

    setSaving(true);
    const { error } = await upsertAdminAppIntroSlide(editing);
    setSaving(false);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    setEditing(null);
    await load(true);
  };

  const removeSlide = (slide: AdminAppIntroSlideRow) => {
    Alert.alert('Slaytı sil', slide.title, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteAdminAppIntroSlide(slide.id);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Uygulama Tanıtımı"
      subtitle="Onboarding slaytlarını düzenleyin"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminActionChip label="Yeni slayt" icon="add-outline" tone="success" onPress={startNew} />

      {editing ? (
        <>
          <AdminSectionHeader title={slides.some((s) => s.id === editing.id) ? 'Slayt düzenle' : 'Yeni slayt'} />
          <GlassCard style={styles.form}>
            <AdminFormField label="ID" value={editing.id} onChangeText={(v) => setEditing({ ...editing, id: v })} />
            <AdminFormField label="İkon (Ionicons)" value={editing.icon} onChangeText={(v) => setEditing({ ...editing, icon: v as AdminAppIntroSlideRow['icon'] })} />
            <AdminFormField label="Renk (#hex)" value={editing.accent} onChangeText={(v) => setEditing({ ...editing, accent: v })} />
            <AdminFormField label="Başlık" value={editing.title} onChangeText={(v) => setEditing({ ...editing, title: v })} />
            <AdminFormField label="Alt başlık" value={editing.subtitle} onChangeText={(v) => setEditing({ ...editing, subtitle: v })} />
            <AdminFormField label="Açıklama" value={editing.description} onChangeText={(v) => setEditing({ ...editing, description: v })} multiline />
            <AdminFormField label="Sıra" value={String(editing.sort_order)} onChangeText={(v) => setEditing({ ...editing, sort_order: parseInt(v, 10) || 0 })} />
            <View style={styles.actions}>
              <AdminActionChip label={saving ? 'Kaydediliyor...' : 'Kaydet'} icon="save-outline" tone="success" onPress={() => void saveSlide()} />
              <AdminActionChip label="Vazgeç" icon="close-outline" onPress={() => setEditing(null)} />
            </View>
          </GlassCard>
        </>
      ) : null}

      {loading ? (
        <AdminEmptyState loading />
      ) : slides.length === 0 ? (
        <AdminEmptyState title="Slayt yok" message="Henüz tanıtım slaytı tanımlanmamış." icon="images-outline" />
      ) : (
        slides.map((slide) => (
          <GlassCard key={slide.id} style={styles.card}>
            <Text variant="label">{slide.title}</Text>
            <Text variant="caption" muted>
              {slide.subtitle} · Sıra {slide.sort_order} · {slide.is_active ? 'Aktif' : 'Pasif'}
            </Text>
            <Text variant="body" secondary numberOfLines={2}>
              {slide.description}
            </Text>
            <View style={styles.actions}>
              <AdminActionChip label="Düzenle" icon="create-outline" onPress={() => setEditing(slide)} />
              <AdminActionChip label="Sil" icon="trash-outline" tone="danger" onPress={() => removeSlide(slide)} />
            </View>
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm, marginBottom: spacing.md },
  card: { gap: spacing.xs, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
});
