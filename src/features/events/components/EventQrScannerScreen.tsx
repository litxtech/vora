import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { checkInWithQrToken, parseQrCheckInToken } from '@/features/events/services/ticketService';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function EventQrScannerScreen() {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);

  const handleRequestPermission = async () => {
    setPermissionRequested(true);
    await requestPermission();
  };

  const handleScan = useCallback(
    async (raw: string) => {
      if (!scanning || processing) return;
      const token = parseQrCheckInToken(raw);
      if (!token) return;

      setScanning(false);
      setProcessing(true);

      const result = await checkInWithQrToken(token);
      setProcessing(false);

      if (!result.ok) {
        Alert.alert('Giriş başarısız', result.error ?? 'QR kod geçersiz.', [
          { text: 'Tekrar dene', onPress: () => setScanning(true) },
        ]);
        return;
      }

      Alert.alert('Giriş onaylandı', 'Etkinliğe başarıyla giriş yaptınız.', [
        {
          text: 'Tamam',
          onPress: () => {
            if (result.eventId) router.replace(`/detail/events/${result.eventId}` as never);
            else router.back();
          },
        },
      ]);
    },
    [scanning, processing],
  );

  if (!permission) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  if (!permission.granted) {
    return (
      <GradientBackground>
        <View style={styles.page}>
          <AuthHeader title="QR Giriş" subtitle="Etkinlik girişi için kamera izni gerekir" />
          <GlassCard style={styles.centerCard}>
            <Text secondary>
              {permissionRequested
                ? 'Kamera erişimi kapalı. QR kod okutmak için Ayarlar’dan kamera iznini açabilirsiniz.'
                : 'Etkinlik giriş kodunu okutmak için kamera erişimine ihtiyacımız var.'}
            </Text>
            {permissionRequested ? (
              <>
                <Button title="Ayarlara Git" onPress={() => void Linking.openSettings()} />
                <Button title="Geri" variant="outline" onPress={() => router.back()} />
              </>
            ) : (
              <Button title="Devam Et" onPress={() => void handleRequestPermission()} />
            )}
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={styles.page}>
        <AuthHeader title="QR Giriş" subtitle="Etkinlik giriş kodunu okutun" />

        <View style={styles.cameraWrap}>
          {scanning ? (
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => handleScan(data)}
            />
          ) : (
            <View style={[styles.camera, styles.cameraPlaceholder, { backgroundColor: colors.surface }]}>
              {processing ? <ActivityIndicator color={colors.primary} size="large" /> : null}
            </View>
          )}
          <View style={styles.overlay}>
            <View style={[styles.frame, { borderColor: colors.primary }]} />
          </View>
        </View>

        <GlassCard>
          <Text secondary variant="caption">
            Organizatörün gösterdiği QR kodu çerçevenin içine hizalayın.
          </Text>
        </GlassCard>

        <Button title="İptal" variant="outline" onPress={() => router.back()} />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCard: {
    gap: spacing.md,
    alignItems: 'stretch',
  },
  cameraWrap: {
    height: 360,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 220,
    height: 220,
    borderWidth: 3,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
});
