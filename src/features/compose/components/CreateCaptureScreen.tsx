import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import type { CameraView as CameraViewType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import {
  CAPTURE_PHOTO_QUALITY,
  capturePictureOptions,
  finalizeCapturedPhoto,
} from '@/features/compose/services/cameraCapture';
import { handoffCameraToVideoPlayback } from '@/lib/audio/safeAudioMode';
import { STORY_MAX_VIDEO_SEC } from '@/features/stories/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const MAX_VIDEO_DURATION_SEC = 90;
const MIN_VIDEO_MS = 800;
const DOUBLE_TAP_MS = 400;
const PREVIEW_TAP_TOP = 56;
const PREVIEW_TAP_BOTTOM = 140;
const VIDEO_MODE_READY_TIMEOUT_MS = 6000;
const RECORD_ASYNC_RETRY_MS = 150;
const RECORD_ASYNC_MAX_ATTEMPTS = 10;

function formatRecordingTime(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function isRenderableGalleryUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://');
}

type CaptureShareMode = 'story' | 'post' | 'reels';

export function CreateCaptureScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const initialMode: CaptureShareMode =
    params.mode === 'story' ? 'story' : params.mode === 'reels' ? 'reels' : 'post';
  const [shareMode, setShareMode] = useState<CaptureShareMode>(initialMode);
  const { requireAuth } = useRequireAuth();
  const cameraRef = useRef<CameraViewType>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [cameraPermissionRequested, setCameraPermissionRequested] = useState(false);

  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [cameraMode, setCameraMode] = useState<'picture' | 'video'>('picture');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraLive, setCameraLive] = useState(false);
  const [galleryThumb, setGalleryThumb] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0);
  const recordStartedAt = useRef<number | null>(null);
  const longPressActive = useRef(false);
  const pendingRecordRef = useRef(false);
  const stopWhenReadyRef = useRef(false);
  const recordingRef = useRef(false);
  const recordAsyncActiveRef = useRef(false);
  const lastPreviewTapAtRef = useRef(0);
  const flipCameraRef = useRef<() => void>(() => {});
  const videoModeReadyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flippingRef = useRef(false);

  const cameraMute = !micPermission?.granted;

  const flipCamera = useCallback(() => {
    if (recording || busy || flippingRef.current) return;
    flippingRef.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  }, [recording, busy]);

  flipCameraRef.current = flipCamera;

  const handlePreviewTap = useCallback(() => {
    const now = Date.now();
    if (now - lastPreviewTapAtRef.current < DOUBLE_TAP_MS) {
      lastPreviewTapAtRef.current = 0;
      flipCameraRef.current();
      return;
    }
    lastPreviewTapAtRef.current = now;
  }, []);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    if (!recording) {
      setRecordingElapsedSec(0);
      return;
    }

    const startedAt = recordStartedAt.current ?? Date.now();
    const tick = () => {
      setRecordingElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    };

    tick();
    const intervalId = setInterval(tick, 200);
    return () => clearInterval(intervalId);
  }, [recording]);

  const clearVideoModeReadyTimeout = useCallback(() => {
    if (videoModeReadyTimeoutRef.current) {
      clearTimeout(videoModeReadyTimeoutRef.current);
      videoModeReadyTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    setCameraReady(false);
    clearVideoModeReadyTimeout();
    return clearVideoModeReadyTimeout;
  }, [cameraMode, facing, clearVideoModeReadyTimeout]);

  const handleCameraReady = useCallback(() => {
    clearVideoModeReadyTimeout();
    flippingRef.current = false;
    setCameraReady(true);
  }, [clearVideoModeReadyTimeout]);

  useEffect(() => {
    void (async () => {
      if (!(await requireAuth('Paylaşım'))) {
        router.back();
      }
    })();
  }, [requireAuth]);

  useEffect(() => {
    if (!cameraPermission?.granted) {
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
  }, [cameraPermission?.granted]);

  useEffect(() => {
    // iOS: kamera oturumu açıkken MediaLibrary çağrısı native çökmeye yol açabiliyor.
    if (Platform.OS === 'ios') return;
    if (!cameraPermission?.granted || !cameraReady) return;

    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (cancelled || status !== 'granted') return;

          const assets = await MediaLibrary.getAssetsAsync({
            first: 1,
            mediaType: MediaLibrary.MediaType.photo,
            sortBy: [[MediaLibrary.SortBy.creationTime, false]],
          });
          const asset = assets.assets[0];
          if (cancelled || !asset) return;

          const info = await MediaLibrary.getAssetInfoAsync(asset);
          const thumbUri = info.localUri ?? asset.uri;
          if (!cancelled && isRenderableGalleryUri(thumbUri)) {
            setGalleryThumb(thumbUri);
          }
        } catch {
          // Galeri önizlemesi opsiyonel.
        }
      })();
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [cameraPermission?.granted, cameraReady]);

  useEffect(() => {
    return () => {
      try {
        cameraRef.current?.stopRecording();
      } catch {
        // Unmount sırasında kayıt durdurulamazsa sessizce geç.
      }
    };
  }, []);

  const handleRequestCameraPermission = useCallback(async () => {
    setCameraPermissionRequested(true);
    await requestCameraPermission();
  }, [requestCameraPermission]);

  const ensurePermissions = useCallback(async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) return false;
    }
    return true;
  }, [cameraPermission?.granted, requestCameraPermission]);

  const ensureMicForVideo = useCallback(async () => {
    if (micPermission?.granted) return true;
    const result = await requestMicPermission();
    return result.granted;
  }, [micPermission?.granted, requestMicPermission]);

  const goToMediaEditor = (
    items: { uri: string; width?: number; height?: number }[],
    mediaType: 'image' | 'video',
    durationSec?: number,
  ) => {
    if (shareMode === 'story') {
      router.replace({
        pathname: '/stories/publish',
        params: {
          mediaUri: items[0]?.uri ?? '',
          mediaType,
          durationSec: durationSec != null ? String(durationSec) : undefined,
        },
      } as Href);
      return;
    }

    if (shareMode === 'reels') {
      router.replace({
        pathname: '/media-editor',
        params: {
          mediaUris: items.map((item) => item.uri).join(','),
          mediaType,
          mediaWidths: items.map((item) => String(item.width ?? 0)).join(','),
          mediaHeights: items.map((item) => String(item.height ?? 0)).join(','),
          publishAs: 'reel',
        },
      } as Href);
      return;
    }

    router.replace({
      pathname: '/media-editor',
      params: {
        mediaUris: items.map((item) => item.uri).join(','),
        mediaType,
        mediaWidths: items.map((item) => String(item.width ?? 0)).join(','),
        mediaHeights: items.map((item) => String(item.height ?? 0)).join(','),
      },
    } as Href);
  };

  const handlePhoto = async () => {
    if (busy || recording || !cameraReady || cameraMode !== 'picture') return;
    if (!(await ensurePermissions())) {
      Alert.alert('İzin gerekli', 'Fotoğraf çekmek için kamera izni vermelisiniz.');
      return;
    }

    setBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync(capturePictureOptions());
      if (photo?.uri) {
        const finalized = await finalizeCapturedPhoto(photo.uri, photo);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        goToMediaEditor(
          [{ uri: finalized.uri, width: finalized.width, height: finalized.height }],
          'image',
        );
      }
    } catch {
      Alert.alert('Hata', 'Fotoğraf çekilemedi.');
    } finally {
      setBusy(false);
    }
  };

  const resetRecordingState = useCallback(() => {
    recordAsyncActiveRef.current = false;
    setRecording(false);
    pendingRecordRef.current = false;
    stopWhenReadyRef.current = false;
    setCameraMode('picture');
    recordStartedAt.current = null;
    clearVideoModeReadyTimeout();
  }, [clearVideoModeReadyTimeout]);

  const runVideoRecording = useCallback(async () => {
    recordAsyncActiveRef.current = true;
    const shouldStopImmediately = stopWhenReadyRef.current;
    const camera = cameraRef.current;

    if (!camera) {
      resetRecordingState();
      return;
    }

    try {
      let video: { uri: string } | undefined;

      for (let attempt = 0; attempt < RECORD_ASYNC_MAX_ATTEMPTS; attempt += 1) {
        try {
          const recordPromise = camera.recordAsync({
            maxDuration: shareMode === 'story' ? STORY_MAX_VIDEO_SEC : MAX_VIDEO_DURATION_SEC,
          });
          if (shouldStopImmediately) {
            setTimeout(() => {
              try {
                camera.stopRecording();
              } catch {
                // Kayıt henüz başlamadıysa sessizce geç.
              }
            }, 120);
          }
          video = await recordPromise;
          break;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const outputNotReady = /not ready|output/i.test(message);
          if (!outputNotReady || attempt === RECORD_ASYNC_MAX_ATTEMPTS - 1) {
            throw err;
          }
          await new Promise<void>((resolve) => {
            setTimeout(resolve, RECORD_ASYNC_RETRY_MS);
          });
        }
      }

      if (video?.uri) {
        const elapsed = recordStartedAt.current ? Date.now() - recordStartedAt.current : 0;
        if (elapsed < MIN_VIDEO_MS) {
          if (!shouldStopImmediately) {
            Alert.alert('Çok kısa', 'Video kaydı için biraz daha basılı tutun.');
          }
          return;
        }
        const elapsedSec = (recordStartedAt.current ? Date.now() - recordStartedAt.current : 0) / 1000;
        if (shareMode === 'story' && elapsedSec > STORY_MAX_VIDEO_SEC) {
          Alert.alert('Hikaye limiti', `Hikaye videosu en fazla ${STORY_MAX_VIDEO_SEC} saniye olabilir.`);
          return;
        }
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCameraLive(false);
        setCameraReady(false);
        await handoffCameraToVideoPlayback();
        goToMediaEditor([{ uri: video.uri }], 'video', elapsedSec);
      }
    } catch (err) {
      if (!shouldStopImmediately) {
        Alert.alert('Hata', 'Video kaydedilemedi.');
      }
    } finally {
      resetRecordingState();
    }
  }, [goToMediaEditor, resetRecordingState, shareMode]);

  useEffect(() => {
    if (!cameraReady || !pendingRecordRef.current || cameraMode !== 'video') return;
    pendingRecordRef.current = false;
    void runVideoRecording();
  }, [cameraReady, cameraMode, runVideoRecording]);

  const startVideoRecording = async () => {
    if (busy || recording) return;
    if (!(await ensurePermissions())) {
      Alert.alert('İzin gerekli', 'Video çekmek için kamera izni vermelisiniz.');
      return;
    }

    const micGranted = await ensureMicForVideo();
    if (!micGranted) {
      Alert.alert(
        'Ses kapalı',
        'Mikrofon izni verilmediği için video sessiz kaydedilecek.',
        [{ text: 'Tamam' }],
      );
    }

    stopWhenReadyRef.current = false;
    setRecording(true);
    recordStartedAt.current = Date.now();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (cameraMode === 'video' && cameraReady) {
      void runVideoRecording();
      return;
    }

    pendingRecordRef.current = true;
    clearVideoModeReadyTimeout();
    videoModeReadyTimeoutRef.current = setTimeout(() => {
      if (!pendingRecordRef.current) return;
      resetRecordingState();
      Alert.alert('Kamera hazır değil', 'Video kaydı başlatılamadı. Lütfen tekrar deneyin.');
    }, VIDEO_MODE_READY_TIMEOUT_MS);

    if (cameraMode !== 'video') {
      setCameraMode('video');
    }
  };

  const stopVideoRecording = useCallback(() => {
    longPressActive.current = false;

    if (pendingRecordRef.current && !recordAsyncActiveRef.current) {
      stopWhenReadyRef.current = true;
      setRecording(false);
      return;
    }

    if (!recordingRef.current && !recordAsyncActiveRef.current) return;

    try {
      cameraRef.current?.stopRecording();
    } catch {
      if (!recordAsyncActiveRef.current) {
        resetRecordingState();
      }
    }
  }, [resetRecordingState]);

  const pickFromGallery = async (mediaType: 'images' | 'videos') => {
    if (busy || recording) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Galeri erişimi için izin vermelisiniz.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType === 'videos' ? ['videos'] : ['images'],
      allowsMultipleSelection: mediaType === 'images',
      selectionLimit: mediaType === 'images' ? 4 : 1,
      videoMaxDuration: shareMode === 'story' ? STORY_MAX_VIDEO_SEC : MAX_VIDEO_DURATION_SEC,
      quality: 0.9,
    });

    if (result.canceled || !result.assets.length) return;

    if (mediaType === 'videos') {
      const uri = result.assets[0]?.uri;
      const duration = result.assets[0]?.duration ?? undefined;
      if (uri) goToMediaEditor([{ uri }], 'video', duration);
      return;
    }

    goToMediaEditor(result.assets.map((asset) => ({ uri: asset.uri })), 'image');
  };

  const cycleFlash = () => {
    setFlash((prev) => (prev === 'off' ? 'auto' : prev === 'auto' ? 'on' : 'off'));
  };

  if (!cameraPermission) {
    return (
      <View style={[styles.centered, { backgroundColor: '#000' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={[styles.permissionPage, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.permissionTitle}>Kamera izni gerekli</Text>
        <Text secondary style={styles.permissionBody}>
          {cameraPermissionRequested
            ? 'Kamera erişimi kapalı. Paylaşım için Ayarlar’dan kamera iznini açabilirsiniz.'
            : 'Paylaşım için fotoğraf ve video çekebilmeniz adına kamera erişimine ihtiyacımız var.'}
        </Text>
        {cameraPermissionRequested ? (
          <>
            <Pressable
              style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
              onPress={() => void Linking.openSettings()}
            >
              <Text style={styles.permissionBtnText}>Ayarlara Git</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text secondary>Geri</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
            onPress={() => void handleRequestCameraPermission()}
          >
            <Text style={styles.permissionBtnText}>Devam Et</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {cameraLive ? (
        <CameraView
          key={`${facing}-${cameraMode}`}
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          flash={flash}
          mode={cameraMode}
          mute={cameraMute}
          mirror={false}
          {...(Platform.OS === 'android' ? { ratio: '4:3' as const } : {})}
          onCameraReady={handleCameraReady}
          onMountError={({ message }) => {
            setCameraLive(false);
            Alert.alert('Kamera açılamadı', message, [{ text: 'Tamam', onPress: () => router.back() }]);
          }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]} />
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.topBtn}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>

        {recording ? (
          <View style={styles.recordingBadge}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>
              {formatRecordingTime(recordingElapsedSec)} / {formatRecordingTime(MAX_VIDEO_DURATION_SEC)}
            </Text>
          </View>
        ) : (
          <View style={styles.topSpacer} />
        )}

        <View style={styles.topRight}>
          <Pressable onPress={cycleFlash} hitSlop={12} style={styles.topBtn}>
            <Ionicons
              name={flash === 'on' ? 'flash' : flash === 'auto' ? 'flash-outline' : 'flash-off-outline'}
              size={22}
              color="#fff"
            />
          </Pressable>
          <Pressable onPress={flipCamera} hitSlop={12} style={styles.topBtn}>
            <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={[styles.modeBar, { top: insets.top + spacing.sm + 44 }]}>
        {(['story', 'post', 'reels'] as const).map((mode) => {
          const active = shareMode === mode;
          const label = mode === 'story' ? 'Hikaye' : mode === 'post' ? 'Gönderi' : 'Reels';
          return (
            <Pressable
              key={mode}
              style={[styles.modeChip, active && styles.modeChipActive]}
              onPress={() => setShareMode(mode)}
            >
              <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          style={styles.galleryBtn}
          onPress={() => void pickFromGallery('images')}
          onLongPress={() => void pickFromGallery('videos')}
          delayLongPress={280}
        >
          {galleryThumb ? (
            <Image source={{ uri: galleryThumb }} style={styles.galleryThumb} contentFit="cover" />
          ) : (
            <View style={styles.galleryPlaceholder}>
              <Ionicons name="images-outline" size={22} color="#fff" />
            </View>
          )}
        </Pressable>

        <Pressable
          disabled={busy || (!cameraReady && !recording)}
          onPress={async () => {
            if (recordingRef.current || recordAsyncActiveRef.current) {
              stopVideoRecording();
              return;
            }
            if (longPressActive.current) {
              longPressActive.current = false;
              return;
            }
            void handlePhoto();
          }}
          onLongPress={() => {
            longPressActive.current = true;
            void startVideoRecording();
          }}
          onPressOut={stopVideoRecording}
          delayLongPress={220}
          style={styles.shutterWrap}
        >
          <View style={[styles.shutterOuter, recording && styles.shutterOuterRecording]}>
            <View style={[styles.shutterInner, recording && styles.shutterInnerRecording]} />
          </View>
        </Pressable>

        <Pressable
          style={styles.sideAction}
          onPress={() => router.push('/compose' as Href)}
        >
          <Ionicons name="create-outline" size={24} color="#fff" />
          <Text style={styles.sideActionLabel}>Metin</Text>
        </Pressable>
      </View>

      <Pressable
        style={[
          styles.cameraTapLayer,
          {
            top: insets.top + PREVIEW_TAP_TOP,
            bottom: insets.bottom + PREVIEW_TAP_BOTTOM,
          },
        ]}
        onPress={handlePreviewTap}
        accessibilityLabel="Kamerayı çevir"
        accessibilityHint="Önizleme alanına iki kez dokunarak ön ve arka kamera arasında geçiş yapın"
      />

      {busy ? (
        <View style={styles.busyOverlay} pointerEvents="none">
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraPlaceholder: {
    backgroundColor: '#000',
  },
  cameraTapLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5,
    elevation: 5,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionPage: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionBody: {
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  permissionBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    zIndex: 10,
    elevation: 10,
  },
  topSpacer: {
    flex: 1,
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: '#ff3b30',
  },
  recordingTime: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  topRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  topBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    zIndex: 10,
    elevation: 10,
  },
  galleryBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  galleryThumb: {
    width: '100%',
    height: '100%',
  },
  galleryPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  shutterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuterRecording: {
    borderColor: '#ff3b30',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: radius.full,
    backgroundColor: '#fff',
  },
  shutterInnerRecording: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: '#ff3b30',
  },
  sideAction: {
    width: 48,
    alignItems: 'center',
    gap: 4,
  },
  sideActionLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  modeBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 11,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modeChipActive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  modeChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  modeChipTextActive: {
    color: '#000',
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
});
