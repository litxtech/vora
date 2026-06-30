import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  removeNotificationSound,
  uploadNotificationSound,
} from '@/features/admin/services/notificationSounds';
import { fetchSoundSettings } from '@/features/notifications/services/notificationData';
import {
  ALLOWED_SOUND_EXTENSIONS,
  SOUND_PICKER_TYPES,
} from '@/lib/notifications/soundConstants';
import { MAX_NOTIFICATION_SOUND_SECONDS } from '@/constants/notifications';
import type { NotificationEventType } from '@/constants/notifications';
import type { NotificationSoundSetting } from '@/lib/notifications/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationProvider';

export function AdminNotificationSoundsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { resyncSounds } = useNotifications();
  const [settings, setSettings] = useState<NotificationSoundSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState<NotificationEventType | null>(null);

  const customCount = useMemo(
    () => settings.filter((s) => s.isCustomEnabled).length,
    [settings],
  );

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const data = await fetchSoundSettings();
    setSettings(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (eventType: NotificationEventType, label: string) => {
    if (!user) return;

    const result = await DocumentPicker.getDocumentAsync({
      type: [...SOUND_PICKER_TYPES],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploading(eventType);

    const { error } = await uploadNotificationSound(
      user.id,
      eventType,
      asset.uri,
      asset.name,
    );

    setUploading(null);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    await resyncSounds();
    Alert.alert(
      'Özel ses aktif',
      `${label} bildirimleri artık "${asset.name}" sesiyle gidecek. Varsayılan ses bu özellik için kapalı.`,
    );
    await load();
  };

  const handleRemove = (eventType: NotificationEventType, label: string) => {
    Alert.alert(
      'Sesi kapat',
      `${label} için özel ses kaldırılsın mı? Bu bildirim türü sessiz gider (yalnızca titreşim/görsel).`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            const { error } = await removeNotificationSound(eventType);
            if (error) Alert.alert('Hata', error);
            else {
              await resyncSounds();
              await load();
            }
          },
        },
      ],
    );
  };

  const handlePreview = async (url: string | null) => {
    if (!url) return;
    const player = createAudioPlayer(url);
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        subscription.remove();
        player.release();
      }
    });
    player.play();
  };

  return (
    <AdminShell
      title="Bildirim Sesleri"
      subtitle={`${customCount} / ${settings.length} özellik · max ${MAX_NOTIFICATION_SOUND_SECONDS} sn`}
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <GlassCard style={styles.info}>
          <View style={styles.wavBadge}>
            <Ionicons name="musical-note" size={16} color={colors.primary} />
            <Text variant="label" style={{ color: colors.primary }}>
              WAV formatı önerilir
            </Text>
          </View>
          <Text secondary variant="caption">
            Her özellik için ayrı ses yükleyebilirsiniz. Beğeni için bir WAV, yorum için başka bir
            WAV… Yükleme yapıldığında o özelliğin push bildirimi yalnızca o sesle gider.
          </Text>
          <Text secondary variant="caption">
            Desteklenen formatlar: {ALLOWED_SOUND_EXTENSIONS.map((e) => e.toUpperCase()).join(', ')}
          </Text>
        </GlassCard>

        {loading ? (
          <AdminEmptyState loading />
        ) : (
          settings.map((setting) => (
            <GlassCard key={setting.eventType} style={styles.row}>
              <View style={styles.rowHeader}>
                <View>
                  <Text variant="label">{setting.label}</Text>
                  <Text secondary variant="caption">
                    {setting.eventType}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: setting.isCustomEnabled
                        ? `${colors.success}22`
                        : `${colors.textMuted}22`,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{ color: setting.isCustomEnabled ? colors.success : colors.textMuted }}
                  >
                    {setting.isCustomEnabled ? 'Özel ses' : 'Sessiz'}
                  </Text>
                </View>
              </View>

              {setting.soundFilename ? (
                <View style={styles.fileRow}>
                  <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
                  <Text secondary variant="caption">
                    {setting.soundFilename}
                    {setting.durationSeconds ? ` · ${setting.durationSeconds}s` : ''}
                  </Text>
                </View>
              ) : (
                <Text secondary variant="caption">
                  Henüz ses yüklenmedi — bildirim sessiz gider
                </Text>
              )}

              <View style={styles.actions}>
                <AdminActionChip
                  label="WAV / ses yükle"
                  icon="cloud-upload-outline"
                  tone="primary"
                  loading={uploading === setting.eventType}
                  onPress={() => handleUpload(setting.eventType, setting.label)}
                />

                {setting.soundUrl ? (
                  <>
                    <AdminActionChip
                      label="Dinle"
                      icon="play-outline"
                      onPress={() => handlePreview(setting.soundUrl)}
                    />
                    <AdminActionChip
                      label="Kaldır"
                      icon="trash-outline"
                      tone="danger"
                      onPress={() => handleRemove(setting.eventType, setting.label)}
                    />
                  </>
                ) : null}
              </View>
            </GlassCard>
          ))
        )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  info: { gap: spacing.sm },
  wavBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  row: { gap: spacing.sm },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
});
