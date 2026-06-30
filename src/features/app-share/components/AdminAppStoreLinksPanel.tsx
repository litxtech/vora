import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { DEFAULT_APP_STORE_LINKS } from '@/features/app-share/constants';
import { updateAppStoreLinksConfig } from '@/features/app-share/services/appStoreLinks';
import { parseAppStoreLinksConfig } from '@/features/app-share/utils/parseAppStoreLinksConfig';
import type { AppStoreLinksConfig } from '@/features/app-share/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  initial: unknown;
  onSaved: () => void;
};

export function AdminAppStoreLinksPanel({ initial, onSaved }: Props) {
  const { colors } = useTheme();
  const [form, setForm] = useState<AppStoreLinksConfig>(() => parseAppStoreLinksConfig(initial));
  const [saving, setSaving] = useState(false);

  const patch = (updates: Partial<AppStoreLinksConfig>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!form.ios_url.trim() && !form.android_url.trim()) {
      Alert.alert('Eksik bilgi', 'En az bir mağaza linki girilmelidir.');
      return;
    }

    setSaving(true);
    const { error } = await updateAppStoreLinksConfig(form);
    setSaving(false);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    Alert.alert('Kaydedildi', 'Mağaza paylaşım linkleri canlı uygulamaya yansıdı.');
    onSaved();
  };

  const handleReset = () => {
    Alert.alert('Sıfırla', 'Mağaza linkleri varsayılana dönsün mü?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sıfırla',
        style: 'destructive',
        onPress: () => setForm({ ...DEFAULT_APP_STORE_LINKS }),
      },
    ]);
  };

  return (
    <>
      <AdminSectionHeader title="Uygulama paylaşım linkleri" />
      <GlassCard style={[styles.infoBanner, { borderColor: `${colors.primary}33` }]}>
        <View style={styles.infoRow}>
          <Ionicons name="share-social-outline" size={20} color={colors.primary} />
          <View style={styles.infoText}>
            <Text variant="label">Mağaza linkleri</Text>
            <Text secondary variant="caption">
              Ayarlar → Uygulamayı Paylaş ekranında gösterilir. Google Play henüz yoksa boş bırakın; eklendiğinde
              anında yansır.
            </Text>
          </View>
        </View>
      </GlassCard>

      <GlassCard style={styles.form}>
        <AdminFormField
          label="iOS App Store linki"
          placeholder="https://apps.apple.com/tr/app/vora-x/id6777120091"
          value={form.ios_url}
          onChangeText={(ios_url) => patch({ ios_url })}
        />
        <AdminFormField
          label="Android Google Play linki"
          placeholder="Henüz yok — yayına alınca buraya yapıştırın"
          value={form.android_url}
          onChangeText={(android_url) => patch({ android_url })}
        />

        <AdminFormField label="Başlık" value={form.title} onChangeText={(title) => patch({ title })} />
        <AdminFormField label="Alt başlık" value={form.subtitle} onChangeText={(subtitle) => patch({ subtitle })} />
        <AdminFormField
          label="Paylaşım mesajı"
          value={form.share_message}
          onChangeText={(share_message) => patch({ share_message })}
          multiline
        />

        <AdminFormField
          label="UTM source"
          placeholder="vora"
          value={form.utm_source}
          onChangeText={(utm_source) => patch({ utm_source })}
        />
        <AdminFormField
          label="UTM medium"
          placeholder="app_share"
          value={form.utm_medium}
          onChangeText={(utm_medium) => patch({ utm_medium })}
        />
        <AdminFormField
          label="UTM campaign"
          placeholder="user_referral"
          value={form.utm_campaign}
          onChangeText={(utm_campaign) => patch({ utm_campaign })}
        />
        <AdminFormField
          label="Admin notu (yalnızca panelde)"
          value={form.admin_note ?? ''}
          onChangeText={(admin_note) => patch({ admin_note })}
          multiline
          accent={colors.warning}
        />

        <View style={styles.actions}>
          <AdminActionChip label="Kaydet" icon="save" tone="primary" loading={saving} onPress={handleSave} fullWidth />
          <AdminActionChip label="Varsayılana sıfırla" icon="refresh-outline" onPress={handleReset} fullWidth />
        </View>
      </GlassCard>
    </>
  );
}

const styles = StyleSheet.create({
  infoBanner: { gap: spacing.xs },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  infoText: { flex: 1, gap: spacing.xs },
  form: { gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
});
