import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import { updateSystemConfig } from '@/features/admin/services/phase2Management';
import { spacing } from '@/constants/theme';
import { DEFAULT_MIN_APP_VERSION } from '@/features/system-gate/constants';
import { ForceUpdateScreen } from '@/features/system-gate/components/ForceUpdateScreen';
import { getCurrentAppVersion } from '@/features/system-gate/services/appVersion';
import { parseMinAppVersionConfig } from '@/features/system-gate/services/configParsers';
import type { MinAppVersionConfig } from '@/features/system-gate/types';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  initial: unknown;
  onSaved: () => void;
};

export function AdminForceUpdatePanel({ initial, onSaved }: Props) {
  const { colors } = useTheme();
  const currentVersion = getCurrentAppVersion();
  const [form, setForm] = useState<MinAppVersionConfig>(() => parseMinAppVersionConfig(initial));
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const previewMinVersion = useMemo(
    () => (form.ios === form.android ? form.ios : `${form.ios} / ${form.android}`),
    [form.android, form.ios],
  );

  const patch = (updates: Partial<MinAppVersionConfig>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!form.ios.trim() || !form.android.trim()) {
      Alert.alert('Eksik bilgi', 'iOS ve Android minimum sürümleri zorunludur.');
      return;
    }
    if (!form.title.trim() || !form.message.trim()) {
      Alert.alert('Eksik bilgi', 'Başlık ve kullanıcı mesajı zorunludur.');
      return;
    }

    setSaving(true);
    const { error } = await updateSystemConfig('min_app_version', form);
    setSaving(false);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    Alert.alert('Kaydedildi', 'Zorunlu güncelleme ayarları güncellendi.');
    onSaved();
  };

  const handleReset = () => {
    Alert.alert('Sıfırla', 'Zorunlu güncelleme ayarları varsayılana dönsün mü?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sıfırla',
        style: 'destructive',
        onPress: () => setForm({ ...DEFAULT_MIN_APP_VERSION }),
      },
    ]);
  };

  return (
    <>
      <AdminSectionHeader title="Zorunlu güncelleme" />
      <GlassCard style={[styles.infoBanner, { borderColor: `${colors.primary}33` }]}>
        <View style={styles.infoRow}>
          <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
          <View style={styles.infoText}>
            <Text variant="label">Sürüm kilidi</Text>
            <Text secondary variant="caption">
              Eski sürümleri engelleyin. Başlık, mesaj, değişiklik notları ve mağaza linklerini buradan yönetin.
            </Text>
          </View>
        </View>
      </GlassCard>

      <AdminStatCard label="Mevcut uygulama sürümü" value={currentVersion} icon="phone-portrait-outline" accent={colors.accent} />

      <GlassCard style={styles.form}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text variant="body">Zorunlu güncelleme aktif</Text>
            <Text secondary variant="caption">
              Kapalıyken sürüm kontrolü yapılmaz.
            </Text>
          </View>
          <Switch
            value={form.enabled}
            onValueChange={(enabled) => patch({ enabled })}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <AdminFormField label="Başlık" placeholder="Güncelleme gerekli" value={form.title} onChangeText={(title) => patch({ title })} />
        <AdminFormField
          label="Kullanıcı mesajı"
          placeholder="Kullanıcıya gösterilecek açıklama"
          value={form.message}
          onChangeText={(message) => patch({ message })}
          multiline
        />
        <AdminFormField
          label="Değişiklik notları"
          placeholder={'Her satır bir madde\nYeni harita özellikleri\nPerformans iyileştirmeleri'}
          value={form.changelog}
          onChangeText={(changelog) => patch({ changelog })}
          multiline
        />
        <AdminFormField
          label="Admin notu (yalnızca panelde)"
          placeholder="İç ekip notu — kullanıcıya gösterilmez"
          value={form.admin_note}
          onChangeText={(admin_note) => patch({ admin_note })}
          multiline
          accent={colors.warning}
        />

        <View style={styles.versionGrid}>
          <View style={styles.versionField}>
            <AdminFormField label="Min iOS sürüm" placeholder="2.2.0" value={form.ios} onChangeText={(ios) => patch({ ios })} />
          </View>
          <View style={styles.versionField}>
            <AdminFormField label="Min Android sürüm" placeholder="2.2.0" value={form.android} onChangeText={(android) => patch({ android })} />
          </View>
        </View>

        <AdminFormField
          label="iOS App Store linki (isteğe bağlı)"
          placeholder="Boş bırakılırsa varsayılan kullanılır"
          value={form.ios_store_url}
          onChangeText={(ios_store_url) => patch({ ios_store_url })}
        />
        <AdminFormField
          label="Android Play Store linki (isteğe bağlı)"
          placeholder="Boş bırakılırsa varsayılan kullanılır"
          value={form.android_store_url}
          onChangeText={(android_store_url) => patch({ android_store_url })}
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
          <ForceUpdateScreen
            config={form}
            currentVersion={currentVersion}
            minVersion={previewMinVersion}
            preview
          />
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
  versionGrid: { flexDirection: 'row', gap: spacing.sm },
  versionField: { flex: 1 },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  previewWrap: { overflow: 'hidden', padding: 0, minHeight: 420 },
});
