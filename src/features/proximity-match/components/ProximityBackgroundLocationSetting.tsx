import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { DEFAULT_REGION_ID, type RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useFeedStore } from '@/features/feed/store/feedStore';
import {
  isProximityBackgroundLocationNativeAvailable,
  requestProximityBackgroundAccess,
  syncProximityBackgroundTracking,
} from '@/features/proximity-match/services/proximityBackgroundTask';
import {
  isProximityBackgroundOptInEnabled,
  setProximityBackgroundOptInEnabled,
  subscribeProximityBackgroundOptIn,
} from '@/features/proximity-match/services/proximityLocationPrefs';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type ProximityBackgroundLocationSettingProps = {
  compact?: boolean;
};

export function ProximityBackgroundLocationSetting({ compact = false }: ProximityBackgroundLocationSettingProps) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const feedRegionId = useFeedStore((s) => s.regionId);
  const regionId = feedRegionId ?? (profile?.region_id as RegionId | undefined) ?? DEFAULT_REGION_ID;

  const [optIn, setOptIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const nativeAvailable = useMemo(() => isProximityBackgroundLocationNativeAvailable(), []);

  const refresh = useCallback(async () => {
    const enabled = await isProximityBackgroundOptInEnabled();
    setOptIn(enabled);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    return subscribeProximityBackgroundOptIn(() => {
      void refresh();
    });
  }, [refresh]);

  const openAppSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  const handleToggle = useCallback(
    async (next: boolean) => {
      if (busy) return;

      if (!next) {
        setBusy(true);
        await setProximityBackgroundOptInEnabled(false);
        await syncProximityBackgroundTracking(regionId, false);
        setOptIn(false);
        setBusy(false);
        return;
      }

      Alert.alert(
        'Arka plan konumu',
        'Uygulama arka plandayken de yakındaki Vora kullanıcılarıyla eşleşmek için konum izni gerekir. Bu seçenek isteğe bağlıdır; kapalıyken yalnızca uygulama açıkken eşleşirsiniz.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Devam',
            onPress: () => {
              void (async () => {
                setBusy(true);
                try {
                  if (!nativeAvailable) {
                    Alert.alert(
                      'Güncelleme gerekli',
                      'Arka plan eşleşmesi için uygulamanın son sürümüyle yeniden yüklenmesi gerekir (dev client build).',
                    );
                    return;
                  }

                  const result = await requestProximityBackgroundAccess(regionId);
                  if (!result.granted) {
                    if (result.reason === 'foreground_denied') {
                      Alert.alert(
                        'Konum izni gerekli',
                        'Önce uygulama kullanılırken konum iznini vermeniz gerekir.',
                        [
                          { text: 'Tamam', style: 'cancel' },
                          { text: 'Ayarlar', onPress: openAppSettings },
                        ],
                      );
                    } else if (result.reason === 'background_denied') {
                      Alert.alert(
                        'Arka plan izni verilmedi',
                        Platform.OS === 'android'
                          ? 'Ayarlar → Konum → "Her zaman" veya "Uygulama kullanılmıyorken" seçeneğini açın.'
                          : 'Ayarlar → Konum → "Her Zaman" seçeneğini açın.',
                        [
                          { text: 'Tamam', style: 'cancel' },
                          { text: 'Ayarları Aç', onPress: openAppSettings },
                        ],
                      );
                    }
                    await setProximityBackgroundOptInEnabled(false);
                    setOptIn(false);
                    return;
                  }

                  await setProximityBackgroundOptInEnabled(true);
                  setOptIn(true);
                } finally {
                  setBusy(false);
                }
              })();
            },
          },
        ],
      );
    },
    [busy, nativeAvailable, openAppSettings, regionId],
  );

  if (loading) return null;

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text variant="label">Arka planda eşleşme</Text>
          <Text secondary variant="caption" style={styles.hint}>
            {optIn
              ? 'Uygulama kapalıyken de yakındaki kullanıcılar bulunur.'
              : 'İsteğe bağlı. Kapalıyken yalnızca uygulama açıkken eşleşirsiniz.'}
          </Text>
          {!nativeAvailable ? (
            <Text variant="caption" style={{ color: colors.warning, marginTop: 4 }}>
              Arka plan modu için uygulama güncellemesi gerekir.
            </Text>
          ) : null}
        </View>
        <Switch
          value={optIn}
          disabled={busy}
          onValueChange={(v) => void handleToggle(v)}
          trackColor={{ true: colors.primary }}
        />
      </View>

      {optIn && nativeAvailable ? (
        <Pressable onPress={openAppSettings} hitSlop={8}>
          <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
            Konum izinlerini yönet
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardCompact: {
    marginHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  hint: {
    lineHeight: 18,
  },
});
