import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  removeNotificationSound,
  uploadNotificationSound,
} from '@/features/admin/services/notificationSounds';
import { fetchSoundSettings } from '@/features/notifications/services/notificationData';
import { MAX_NOTIFICATION_SOUND_SECONDS } from '@/constants/notifications';
import type { NotificationEventType } from '@/constants/notifications';
import type { NotificationSoundSetting } from '@/lib/notifications/types';
import { canAdmin } from '@/constants/roles';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

export function AdminNotificationSoundsScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<NotificationSoundSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<NotificationEventType | null>(null);

  const isAdmin = profile?.role ? canAdmin(profile.role) : false;

  const load = async () => {
    setLoading(true);
    const data = await fetchSoundSettings();
    setSettings(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (!isAdmin) {
    return (
      <GradientBackground>
        <View style={styles.page}>
          <AuthHeader title="Admin" subtitle="Yetkisiz erişim" />
          <GlassCard>
            <Text secondary>Bu sayfaya yalnızca adminler erişebilir.</Text>
            <Button title="Geri" onPress={() => router.back()} />
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  const handleUpload = async (eventType: NotificationEventType) => {
    if (!user) return;

    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
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

    Alert.alert('Kaydedildi', 'Özel ses aktif. Varsayılan ses bu özellik için kapatıldı.');
    await load();
  };

  const handleRemove = (eventType: NotificationEventType) => {
    Alert.alert('Sesi kaldır', 'Varsayılan sistem sesine dönülsün mü?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          const { error } = await removeNotificationSound(eventType);
          if (error) Alert.alert('Hata', error);
          else await load();
        },
      },
    ]);
  };

  const handlePreview = async (url: string | null) => {
    if (!url) return;
    const { sound } = await Audio.Sound.createAsync({ uri: url });
    await sound.playAsync();
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page}>
        <AuthHeader
          title="Bildirim Sesleri"
          subtitle={`Admin paneli · max ${MAX_NOTIFICATION_SOUND_SECONDS} sn`}
        />

        <GlassCard style={styles.info}>
          <Text secondary variant="caption">
            Bir özelliğe ses dosyası eklendiğinde varsayılan ses kapatılır ve yüklenen dosya
            kullanılır. Android: Firebase FCM · iOS: Apple Push Notification.
          </Text>
        </GlassCard>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          settings.map((setting) => (
            <GlassCard key={setting.eventType} style={styles.row}>
              <View style={styles.rowHeader}>
                <Text variant="label">{setting.label}</Text>
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
                    {setting.isCustomEnabled ? 'Özel ses' : 'Varsayılan'}
                  </Text>
                </View>
              </View>

              {setting.soundFilename ? (
                <Text secondary variant="caption">
                  {setting.soundFilename}
                  {setting.durationSeconds ? ` · ${setting.durationSeconds}s` : ''}
                </Text>
              ) : (
                <Text secondary variant="caption">
                  Henüz özel ses yüklenmedi
                </Text>
              )}

              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionBtn, { borderColor: colors.border }]}
                  onPress={() => handleUpload(setting.eventType)}
                  disabled={uploading === setting.eventType}
                >
                  {uploading === setting.eventType ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                      <Text variant="caption" style={{ color: colors.primary }}>
                        Ses yükle
                      </Text>
                    </>
                  )}
                </Pressable>

                {setting.soundUrl ? (
                  <>
                    <Pressable
                      style={[styles.actionBtn, { borderColor: colors.border }]}
                      onPress={() => handlePreview(setting.soundUrl)}
                    >
                      <Ionicons name="play-outline" size={18} color={colors.text} />
                      <Text variant="caption">Dinle</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { borderColor: colors.danger }]}
                      onPress={() => handleRemove(setting.eventType)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      <Text variant="caption" style={{ color: colors.danger }}>
                        Kaldır
                      </Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  info: { gap: spacing.sm },
  row: { gap: spacing.sm },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
