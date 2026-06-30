import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { CameraView as CameraViewType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { capturePictureOptions, finalizeCapturedPhoto } from '@/features/compose/services/cameraCapture';
import { useTheme } from '@/providers/ThemeProvider';
import { CHAT_EPHEMERAL_DEFAULT_DURATION_SEC } from '../constants';

export type ChatQuickCaptureResult = {
  uri: string;
  ephemeral: boolean;
};

type ChatQuickCaptureProps = {
  visible: boolean;
  ephemeral: boolean;
  onEphemeralChange: (ephemeral: boolean) => void;
  onClose: () => void;
  onPreview: (result: ChatQuickCaptureResult) => void;
};

export function ChatQuickCapture({
  visible,
  ephemeral,
  onEphemeralChange,
  onClose,
  onPreview,
}: ChatQuickCaptureProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraViewType>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraLive, setCameraLive] = useState(false);

  const handleClose = useCallback(() => {
    setBusy(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) return;
    setBusy(false);
    setFacing('back');
    setCameraReady(false);
    setCameraLive(false);
  }, [visible]);

  useEffect(() => {
    setCameraReady(false);
  }, [facing]);

  useEffect(() => {
    if (!visible || !cameraPermission?.granted) {
      setCameraLive(false);
      return;
    }

    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setCameraLive(true);
      });
    });

    return () => {
      cancelled = true;
      task.cancel();
      setCameraLive(false);
    };
  }, [visible, cameraPermission?.granted]);

  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
  }, []);

  const ensureCameraPermission = async (): Promise<boolean> => {
    if (cameraPermission?.granted) return true;
    const result = await requestCameraPermission();
    if (result.granted) return true;
    Alert.alert(
      'Kamera izni gerekli',
      'Fotoğraf çekmek için kamera erişimine izin verin.',
      [
        { text: 'Vazgeç', style: 'cancel', onPress: handleClose },
        { text: 'Ayarlar', onPress: () => void Linking.openSettings() },
      ],
    );
    return false;
  };

  const handleCapturePhoto = async () => {
    if (busy || !cameraRef.current || !cameraReady) return;
    if (!(await ensureCameraPermission())) return;

    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync(capturePictureOptions());
      if (!photo?.uri) return;
      const finalized = await finalizeCapturedPhoto(photo.uri, photo);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPreview({ uri: finalized.uri, ephemeral });
      handleClose();
    } catch {
      Alert.alert('Hata', 'Fotoğraf çekilemedi. Tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  };

  const flipCamera = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  if (!visible) return null;

  const permissionDenied =
    cameraPermission && !cameraPermission.granted && !cameraPermission.canAskAgain;
  const shutterDisabled = busy || !cameraReady;

  return (
    <Modal
      visible
      animationType={resolveModalAnimationType('slide')}
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <StatusBar style="light" />
      <View style={styles.container}>
        {permissionDenied ? (
          <View style={[styles.permissionWrap, { paddingTop: insets.top }]}>
            <Ionicons name="camera-outline" size={48} color="#fff" />
            <Text variant="body" style={styles.permissionText}>
              Kamera izni kapalı. Ayarlardan izin verin.
            </Text>
            <Pressable onPress={() => void Linking.openSettings()} style={[styles.modeBtn, { backgroundColor: colors.primary }]}>
              <Text variant="body" style={styles.modeBtnText}>
                Ayarları Aç
              </Text>
            </Pressable>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text variant="caption" style={styles.permissionText}>
                Vazgeç
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {cameraLive ? (
              <CameraView
                key={facing}
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing={facing}
                mode="picture"
                mirror={false}
                {...(Platform.OS === 'android' ? { ratio: '4:3' as const } : {})}
                onCameraReady={handleCameraReady}
                onMountError={({ message }) => {
                  setCameraLive(false);
                  Alert.alert('Kamera açılamadı', message, [
                    { text: 'Tamam', onPress: handleClose },
                  ]);
                }}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]} />
            )}

            {!cameraReady ? (
              <View style={styles.cameraLoading} pointerEvents="none">
                <ActivityIndicator color="#fff" size="large" />
              </View>
            ) : null}

            <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
              <Pressable onPress={handleClose} style={styles.iconCircle} hitSlop={12} accessibilityLabel="Kapat">
                <Ionicons name="close" size={26} color="#fff" />
              </Pressable>
              <View style={styles.topSpacer} />
              <Pressable
                onPress={flipCamera}
                style={styles.iconCircle}
                hitSlop={12}
                accessibilityLabel="Kamerayı çevir"
              >
                <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
              </Pressable>
            </View>

            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}>
              <View style={styles.modeRow}>
                <Pressable
                  onPress={() => onEphemeralChange(true)}
                  style={[styles.modeBtn, ephemeral ? { backgroundColor: colors.primary } : styles.modeBtnIdle]}
                >
                  <Ionicons name="timer-outline" size={16} color="#fff" />
                  <Text variant="caption" style={styles.modeBtnText}>
                    Süreli ({CHAT_EPHEMERAL_DEFAULT_DURATION_SEC}s)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onEphemeralChange(false)}
                  style={[styles.modeBtn, !ephemeral ? { backgroundColor: colors.primary } : styles.modeBtnIdle]}
                >
                  <Ionicons name="infinite-outline" size={16} color="#fff" />
                  <Text variant="caption" style={styles.modeBtnText}>
                    Süresiz
                  </Text>
                </Pressable>
              </View>

              <Text variant="caption" style={styles.hintText}>
                {cameraReady ? 'Fotoğraf çekmek için dokun' : 'Kamera hazırlanıyor…'}
              </Text>

              <Pressable
                onPress={() => void handleCapturePhoto()}
                disabled={shutterDisabled}
                accessibilityLabel="Fotoğraf çek"
                style={[styles.shutterOuter, shutterDisabled && { opacity: 0.65 }]}
              >
                {busy ? (
                  <ActivityIndicator color="#111" size="large" />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraPlaceholder: {
    backgroundColor: '#000',
  },
  cameraLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    zIndex: 10,
    elevation: 10,
  },
  topSpacer: {
    flex: 1,
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    zIndex: 10,
    elevation: 10,
  },
  hintText: {
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
    textAlign: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  modeBtnIdle: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modeBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  shutterInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#fff',
  },
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  permissionText: {
    color: '#fff',
    textAlign: 'center',
  },
});
