import { useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { updateSystemConfig } from '@/features/admin/services/phase2Management';
import { spacing } from '@/constants/theme';
import { DEFAULT_MAINTENANCE_MODE } from '@/features/system-gate/constants';
import { MaintenanceScreen } from '@/features/system-gate/components/MaintenanceScreen';
import { parseMaintenanceModeConfig } from '@/features/system-gate/services/configParsers';
import type { MaintenanceModeConfig } from '@/features/system-gate/types';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  initial: unknown;
  onSaved: () => void;
};

export function AdminMaintenancePanel({ initial, onSaved }: Props) {
  const { colors } = useTheme();
  const [form, setForm] = useState<MaintenanceModeConfig>(() => parseMaintenanceModeConfig(initial));
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const patch = (updates: Partial<MaintenanceModeConfig>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      Alert.alert('Eksik bilgi', 'Başlık ve kullanıcı mesajı zorunludur.');
      return;
    }

    setSaving(true);
    const { error } = await updateSystemConfig('maintenance_mode', form);
    setSaving(false);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    Alert.alert('Kaydedildi', 'Bakım modu ayarları güncellendi.');
    onSaved();
  };

  const handleReset = () => {
    Alert.alert('Sıfırla', 'Bakım modu ayarları varsayılana dönsün mü?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sıfırla',
        style: 'destructive',
        onPress: () => setForm({ ...DEFAULT_MAINTENANCE_MODE }),
      },
    ]);
  };

  return (
    <>
      <AdminSectionHeader title="Bakım modu" />
      <GlassCard style={[styles.infoBanner, { borderColor: `${colors.warning}33` }]}>
        <View style={styles.infoRow}>
          <Ionicons name="construct-outline" size={20} color={colors.warning} />
          <View style={styles.infoText}>
            <Text variant="label">Planlı bakım</Text>
            <Text secondary variant="caption">
              Aktifken tüm kullanıcılar bakım ekranını görür. Tahmini bitiş ve iç not ekleyebilirsiniz.
            </Text>
          </View>
        </View>
      </GlassCard>

      <GlassCard style={styles.form}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text variant="body">Bakım modu aktif</Text>
            <Text secondary variant="caption">
              Kaydettikten sonra kullanıcılar uygulamaya giremez.
            </Text>
          </View>
          <Switch
            value={form.enabled}
            onValueChange={(enabled) => patch({ enabled })}
            trackColor={{ true: colors.warning }}
          />
        </View>

        <AdminFormField label="Başlık" placeholder="Bakım çalışması" value={form.title} onChangeText={(title) => patch({ title })} />
        <AdminFormField
          label="Kullanıcı mesajı"
          placeholder="Kullanıcıya gösterilecek açıklama"
          value={form.message}
          onChangeText={(message) => patch({ message })}
          multiline
        />
        <AdminFormField
          label="Tahmini bitiş (ISO veya boş)"
          placeholder="2026-06-15T18:00:00.000Z"
          value={form.estimated_end ?? ''}
          onChangeText={(estimated_end) => patch({ estimated_end: estimated_end.trim() || null })}
        />
        <AdminFormField
          label="Admin notu (yalnızca panelde)"
          placeholder="İç ekip notu — kullanıcıya gösterilmez"
          value={form.admin_note}
          onChangeText={(admin_note) => patch({ admin_note })}
          multiline
          accent={colors.warning}
        />

        <View style={styles.actions}>
          <AdminActionChip label="Kaydet" icon="save" tone="primary" loading={saving} onPress={handleSave} fullWidth />
          <AdminActionChip
            label={showPreview ? 'Önizlemeyi gizle' : 'Önizle'}
            icon="eye-outline"
            tone="warning"
            onPress={() => setShowPreview((value) => !value)}
            fullWidth
          />
          <AdminActionChip label="Varsayılana sıfırla" icon="refresh-outline" onPress={handleReset} fullWidth />
        </View>
      </GlassCard>

      {showPreview ? (
        <GlassCard style={styles.previewWrap}>
          <MaintenanceScreen config={form} preview />
        </GlassCard>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  infoBanner: { gap: spacing.xs },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  infoText: { flex: 1, gap: spacing.xs },
  form: { gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  switchText: { flex: 1, gap: spacing.xs },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  previewWrap: { overflow: 'hidden', padding: 0, minHeight: 380 },
});
