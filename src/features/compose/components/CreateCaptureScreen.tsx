import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import {
  capturePictureOptions,
  captureRecordOptions,
  captureVideoViewProps,
  finalizeCapturedPhoto,
} from '@/features/compose/services/cameraCapture';
import { handoffCameraToVideoPlayback } from '@/lib/audio/safeAudioMode';
import {
  STORY_CAPTURE_BOTTOM_OFFSET,
  STORY_CAPTURE_TOP_OFFSET,
  STORY_CARD_HORIZONTAL_INSET,
  STORY_MAX_VIDEO_SEC,
} from '@/features/stories/constants';
import { storyCardFrameStyle } from '@/features/stories/utils/storyCardChrome';
import { routeStoryVideo } from '@/features/stories/services/routeStoryVideo';
import { prepareStoryVideoPreviewUri } from '@/features/stories/services/prepareStoryVideoPreview';
import { useStoryPublishStore } from '@/features/stories/store/storyPublishStore';
import { useMediaHandoffStore } from '@/features/compose/store/mediaHandoffStore';
import { useMediaEditorStore } from '@/features/compose/store/mediaEditorStore';
import { DEFAULT_ZOOM } from '@/features/compose/utils/mediaEditorZoom';
import { prepareLocalImageUri } from '@/lib/media/prepareLocalImage';
import { probeVideoDuration } from '@/features/vora-studio/services/exportStudioVideo';
import { radius, spacing } from '@/constants/theme';
import { deferAfterInteractions } from '@/lib/ui/deferUntilUiIdle';
import { useTheme } from '@/providers/ThemeProvider';
import { useCaptureCameraZoom } from '@/features/compose/hooks/useCaptureCameraZoom';
import { CaptureCameraZoomOverlay } from '@/features/compose/components/CaptureCameraZoomOverlay';
import { CapturedVideoPreview } from '@/components/media/CapturedVideoPreview';

const MAX_VIDEO_DURATION_SEC = 90;
const MIN_VIDEO_MS = 800;
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
  const params = useLocalSearchParams<{ mode?: string; capture?: string }>();
  const { requireAuth } = useRequireAuth();
  const showSoundCreate = useFeatureVisible('user-sounds');
  const storiesEnabled = useFeatureVisible('stories');
  const requestedMode: CaptureShareMode =
    params.mode === 'story' && storiesEnabled
      ? 'story'
      : params.mode === 'reels'
        ? 'reels'
        : 'post';
  const [shareMode, setShareMode] = useState<CaptureShareMode>(requestedMode);
  const initialCameraMode: 'picture' | 'video' = params.capture === 'video' ? 'video' : 'picture';
  const cameraRef = useRef<CameraViewType>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [cameraPermissionRequested, setCameraPermissionRequested] = useState(false);

  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [cameraMode, setCameraMode] = useState<'picture' | 'video'>(initialCameraMode);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraLive, setCameraLive] = useState(false);
  const [galleryThumb, setGalleryThumb] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [handoffPreviewUri, setHandoffPreviewUri] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0);
  const recordStartedAt = useRef<number | null>(null);
  const pendingRecordRef = useRef(false);
  const stopWhenReadyRef = useRef(false);
  const recordingRef = useRef(false);
  const recordAsyncActiveRef = useRef(false);
  const videoModeReadyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flippingRef = useRef(false);

  const cameraMute = !micPermission?.granted;

  const handleFlipCameraRequest = useCallback(() => {
    if (recording || busy || flippingRef.current) return;
    flippingRef.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  }, [busy, recording]);

  const {
    linearZoom,
    displayZoom,
    selectedLens,
    indicatorVisible,
    activePresetId,
    presets,
    previewGesture,
    applyPreset,
    handleAvailableLensesChanged,
    refreshAvailableLenses,
    updateZoomFromRail,
    handleZoomRailStart,
    handleZoomRailEnd,
    flipCameraWithReset,
    showManualControls,
    isPinchingRef,
  } = useCaptureCameraZoom({
    enabled: cameraLive && !handoffPreviewUri,
    recording,
    facing,
    resetKey: `${facing}-${cameraMode}`,
    onFlipCamera: handleFlipCameraRequest,
  });

  useEffect(() => {
    setShareMode(requestedMode);
  }, [requestedMode]);

  useEffect(() => {
    if (!storiesEnabled && shareMode === 'story') {
      setShareMode('post');
    }
  }, [shareMode, storiesEnabled]);

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
    void refreshAvailableLenses(() => cameraRef.current?.getAvailableLensesAsync() ?? Promise.resolve([]));
  }, [clearVideoModeReadyTimeout, refreshAvailableLenses]);

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
    const task = deferAfterInteractions(() => {
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
    const task = deferAfterInteractions(() => {
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

  const goToMediaEditor = useCallback(
    async (
      items: { uri: string; width?: number; height?: number }[],
      mediaType: 'image' | 'video',
      durationSec?: number,
    ) => {
      if (shareMode === 'story') {
        const uri = items[0]?.uri ?? '';
        if (!uri) return;

        if (mediaType === 'video') {
          setBusy(true);
          try {
            await routeStoryVideo(uri, durationSec);
          } catch (err) {
            Alert.alert(
              'Video hazırlanamadı',
              err instanceof Error ? err.message : 'Lütfen tekrar deneyin.',
            );
          } finally {
            setBusy(false);
          }
          return;
        }

        setBusy(true);
        try {
          const stableUri = await prepareLocalImageUri(uri);
          useStoryPublishStore.getState().setDraft({
            mediaUri: stableUri,
            mediaType: 'image',
            durationSec,
            mediaWidth: items[0]?.width,
            mediaHeight: items[0]?.height,
          });
          router.replace('/stories/publish' as Href);
        } catch (err) {
          Alert.alert(
            'Fotoğraf hazırlanamadı',
            err instanceof Error ? err.message : 'Lütfen tekrar deneyin.',
          );
        } finally {
          setBusy(false);
        }
        return;
      }

      if (shareMode === 'reels' || shareMode === 'post') {
        // file:// route params'ta bozulur — store + video için slide'ları önceden doldur.
        if (mediaType === 'video' && items[0]?.uri) {
          let duration = durationSec ?? 0;
          if (duration <= 0) {
            try {
              duration = await probeVideoDuration(items[0].uri);
            } catch {
              duration = 0;
            }
          }
          useMediaEditorStore.getState().initSlides([
            {
              uri: items[0].uri,
              isVideo: true,
              durationSec: duration,
              textOverlays: [],
              filterId: 'none',
              rotationDeg: 0,
              mediaWidth: items[0].width ?? 0,
              mediaHeight: items[0].height ?? 0,
              zoomScale: DEFAULT_ZOOM.zoomScale,
              zoomTranslateX: DEFAULT_ZOOM.zoomTranslateX,
              zoomTranslateY: DEFAULT_ZOOM.zoomTranslateY,
            },
          ]);
        }

        useMediaHandoffStore.getState().setHandoff({
          mediaUris: items.map((item) => item.uri),
          mediaType,
          mediaWidths: items.map((item) => item.width ?? 0),
          mediaHeights: items.map((item) => item.height ?? 0),
          publishAs: shareMode === 'reels' ? 'reel' : 'post',
        });
        router.replace({
          pathname: '/media-editor',
          params: {
            handoff: '1',
            mediaType,
            seeded: mediaType === 'video' ? '1' : '0',
            ...(shareMode === 'reels' ? { publishAs: 'reel' } : {}),
          },
        } as Href);
        return;
      }
    },
    [shareMode],
  );

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
        await goToMediaEditor(
          [
            {
              uri: finalized.uri,
              width: finalized.width > 0 ? finalized.width : photo.width,
              height: finalized.height > 0 ? finalized.height : photo.height,
            },
          ],
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
          const recordPromise = camera.recordAsync(
            captureRecordOptions(
              shareMode === 'story' ? STORY_MAX_VIDEO_SEC : MAX_VIDEO_DURATION_SEC,
            ),
          );
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
            Alert.alert('Çok kısa', 'Video kaydı için biraz daha kayıt alın.');
          }
          return;
        }
        const elapsedSec = (recordStartedAt.current ? Date.now() - recordStartedAt.current : 0) / 1000;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setBusy(true);
        try {
          // Önce kamerayı kapat — kopya/oynatma kamera oturumu açıkken siyah ekran verir.
          setHandoffPreviewUri(null);
          setCameraLive(false);
          setCameraReady(false);
          await handoffCameraToVideoPlayback();
          if (Platform.OS === 'ios') {
            await new Promise<void>((resolve) => setTimeout(resolve, 200));
          }

          const playableUri = await prepareStoryVideoPreviewUri(video.uri);
          if (shareMode === 'story') {
            setHandoffPreviewUri(playableUri);
            await routeStoryVideo(playableUri, elapsedSec);
          } else {
            await goToMediaEditor([{ uri: playableUri }], 'video', elapsedSec);
          }
        } catch (err) {
          Alert.alert(
            'Video hazırlanamadı',
            err instanceof Error ? err.message : 'Lütfen tekrar deneyin.',
          );
          setHandoffPreviewUri(null);
          setCameraLive(true);
        } finally {
          setBusy(false);
        }
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
    if (isPinchingRef.current) return;

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
  }, [isPinchingRef, resetRecordingState]);

  const handleCapturePress = useCallback(() => {
    if (recordingRef.current || recordAsyncActiveRef.current) {
      stopVideoRecording();
      return;
    }

    if (cameraMode === 'video') {
      void startVideoRecording();
      return;
    }

    void handlePhoto();
  }, [cameraMode, stopVideoRecording]);

  const pickFromGallery = useCallback(async (mediaType: 'images' | 'videos') => {
    if (busy || recording) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Galeri erişimi için izin vermelisiniz.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType === 'videos' ? ['videos'] : ['images'],
      allowsMultipleSelection: shareMode === 'story' ? false : mediaType === 'images',
      selectionLimit: shareMode === 'story' ? 1 : mediaType === 'images' ? 4 : 1,
      allowsEditing: false,
      ...(shareMode === 'story' && mediaType === 'videos'
        ? {}
        : { videoMaxDuration: shareMode === 'story' ? STORY_MAX_VIDEO_SEC : MAX_VIDEO_DURATION_SEC }),
      quality: 0.9,
    });

    if (result.canceled || !result.assets.length) return;

    if (mediaType === 'videos') {
      const uri = result.assets[0]?.uri;
      const duration = result.assets[0]?.duration ?? undefined;
      if (!uri) return;

      setBusy(true);
      try {
        if (shareMode === 'story') {
          await routeStoryVideo(uri, duration);
        } else {
          const playableUri = await prepareStoryVideoPreviewUri(uri);
          await goToMediaEditor([{ uri: playableUri }], 'video', duration);
        }
      } catch (err) {
        Alert.alert(
          'Video hazırlanamadı',
          err instanceof Error ? err.message : 'Lütfen tekrar deneyin.',
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    void goToMediaEditor(
      result.assets.map((asset) => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      })),
      'image',
    );
  }, [busy, goToMediaEditor, recording, shareMode]);

  const openGalleryPicker = useCallback(() => {
    if (busy || recording) return;

    Alert.alert('Galeriden seç', 'Ne eklemek istiyorsun?', [
      { text: 'Resim', onPress: () => void pickFromGallery('images') },
      { text: 'Video', onPress: () => void pickFromGallery('videos') },
      { text: 'İptal', style: 'cancel' },
    ]);
  }, [busy, pickFromGallery, recording]);

  const pickStoryFromGallery = useCallback(() => {
    Alert.alert('Galeriden seç', 'Hikayene ne eklemek istiyorsun?', [
      { text: 'Fotoğraf', onPress: () => void pickFromGallery('images') },
      { text: 'Video', onPress: () => void pickFromGallery('videos') },
      { text: 'İptal', style: 'cancel' },
    ]);
  }, [pickFromGallery]);

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
      {shareMode === 'story' ? (
        <View
          style={[
            storyCardFrameStyle.frame,
            styles.storyCameraFrame,
            {
              top: insets.top + STORY_CAPTURE_TOP_OFFSET,
              bottom: insets.bottom + STORY_CAPTURE_BOTTOM_OFFSET,
              left: STORY_CARD_HORIZONTAL_INSET,
              right: STORY_CARD_HORIZONTAL_INSET,
            },
          ]}
        >
          {handoffPreviewUri ? (
            <CapturedVideoPreview
              key={handoffPreviewUri}
              uri={handoffPreviewUri}
              contentFit="cover"
              loop={false}
              autoPlay
            />
          ) : cameraLive ? (
            <CameraView
              key={`${facing}-${cameraMode}`}
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              flash={flash}
              mode={cameraMode}
              mute={cameraMute}
              mirror={facing === 'front'}
              zoom={linearZoom}
              {...captureVideoViewProps(cameraMode)}
              {...(Platform.OS === 'ios'
                ? {
                    selectedLens,
                    onAvailableLensesChanged: ({ lenses }) =>
                      handleAvailableLensesChanged(lenses),
                  }
                : {})}
              onCameraReady={handleCameraReady}
              onMountError={({ message }) => {
                setCameraLive(false);
                Alert.alert('Kamera açılamadı', message, [{ text: 'Tamam', onPress: () => router.back() }]);
              }}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]} />
          )}
        </View>
      ) : cameraLive ? (
        <CameraView
          key={`${facing}-${cameraMode}`}
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          flash={flash}
          mode={cameraMode}
          mute={cameraMute}
          mirror={facing === 'front'}
          zoom={linearZoom}
          {...captureVideoViewProps(cameraMode)}
          {...(Platform.OS === 'ios'
            ? {
                selectedLens,
                onAvailableLensesChanged: ({ lenses }) =>
                  handleAvailableLensesChanged(lenses),
              }
            : {})}
          onCameraReady={handleCameraReady}
          onMountError={({ message }) => {
            setCameraLive(false);
            Alert.alert('Kamera açılamadı', message, [{ text: 'Tamam', onPress: () => router.back() }]);
          }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]} />
      )}

      {cameraLive && !handoffPreviewUri ? (
        <CaptureCameraZoomOverlay
          enabled
          showManualControls={showManualControls}
          bounds={{
            top: insets.top + 56,
            bottom: insets.bottom + 168,
          }}
          linearZoom={linearZoom}
          displayZoom={displayZoom}
          indicatorVisible={indicatorVisible}
          activePresetId={activePresetId}
          presets={presets}
          previewGesture={previewGesture}
          applyPreset={applyPreset}
          onZoomRailChange={updateZoomFromRail}
          onZoomRailStart={handleZoomRailStart}
          onZoomRailEnd={handleZoomRailEnd}
        />
      ) : null}

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
          {showSoundCreate ? (
            <Pressable
              hitSlop={12}
              style={styles.topBtn}
              onPress={async () => {
                if (!(await requireAuth('Ses Oluştur'))) return;
                router.push('/sounds/create' as Href);
              }}
            >
              <Ionicons name="mic-outline" size={22} color="#fff" />
            </Pressable>
          ) : null}
          <Pressable onPress={cycleFlash} hitSlop={12} style={styles.topBtn}>
            <Ionicons
              name={flash === 'on' ? 'flash' : flash === 'auto' ? 'flash-outline' : 'flash-off-outline'}
              size={22}
              color="#fff"
            />
          </Pressable>
          <Pressable onPress={flipCameraWithReset} hitSlop={12} style={styles.topBtn}>
            <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={[styles.modeBar, { top: insets.top + spacing.sm + 44 }]}>
        {((storiesEnabled ? ['story', 'post', 'reels'] : ['post', 'reels']) as CaptureShareMode[]).map(
          (mode) => {
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
          onPress={() => {
            if (shareMode === 'story') {
              pickStoryFromGallery();
              return;
            }
            openGalleryPicker();
          }}
        >
          {galleryThumb ? (
            <Image source={{ uri: galleryThumb }} style={styles.galleryThumb} contentFit="cover" />
          ) : (
            <View style={styles.galleryPlaceholder}>
              <Ionicons name="images-outline" size={22} color="#fff" />
            </View>
          )}
        </Pressable>

        <View style={styles.captureCenter}>
          <View style={styles.captureModeRow}>
            <Pressable
              disabled={recording || busy}
              onPress={() => setCameraMode('picture')}
              style={[
                styles.captureModeBtn,
                cameraMode === 'picture' && styles.captureModeBtnActive,
                (recording || busy) && styles.captureModeBtnDisabled,
              ]}
            >
              <Ionicons
                name="image-outline"
                size={15}
                color={cameraMode === 'picture' ? '#000' : '#fff'}
              />
              <Text
                style={[
                  styles.captureModeText,
                  cameraMode === 'picture' && styles.captureModeTextActive,
                ]}
              >
                Resim
              </Text>
            </Pressable>
            <Pressable
              disabled={recording || busy}
              onPress={() => setCameraMode('video')}
              style={[
                styles.captureModeBtn,
                cameraMode === 'video' && styles.captureModeBtnActive,
                (recording || busy) && styles.captureModeBtnDisabled,
              ]}
            >
              <Ionicons
                name="videocam-outline"
                size={15}
                color={cameraMode === 'video' ? '#000' : '#fff'}
              />
              <Text
                style={[
                  styles.captureModeText,
                  cameraMode === 'video' && styles.captureModeTextActive,
                ]}
              >
                Video
              </Text>
            </Pressable>
          </View>

          <Pressable
            disabled={busy || (!cameraReady && !recording)}
            onPress={handleCapturePress}
            style={styles.shutterWrap}
          >
            <View
              style={[
                styles.shutterOuter,
                cameraMode === 'video' && styles.shutterOuterVideo,
                recording && styles.shutterOuterRecording,
              ]}
            >
              <View
                style={[
                  styles.shutterInner,
                  cameraMode === 'video' && styles.shutterInnerVideo,
                  recording && styles.shutterInnerRecording,
                ]}
              />
            </View>
          </Pressable>
        </View>

        <Pressable
          style={styles.sideAction}
          onPress={() => router.push('/compose' as Href)}
        >
          <Ionicons name="create-outline" size={24} color="#fff" />
          <Text style={styles.sideActionLabel}>Metin</Text>
        </Pressable>
      </View>

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
    backgroundColor: '#0a0a0a',
  },
  storyCameraFrame: {
    position: 'absolute',
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
  captureCenter: {
    alignItems: 'center',
    gap: spacing.md,
  },
  captureModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  captureModeBtn: {
    minWidth: 82,
    height: 34,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
  },
  captureModeBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  captureModeBtnDisabled: {
    opacity: 0.45,
  },
  captureModeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  captureModeTextActive: {
    color: '#000',
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
  shutterOuterVideo: {
    borderColor: '#ff3b30',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: radius.full,
    backgroundColor: '#fff',
  },
  shutterInnerVideo: {
    backgroundColor: '#ff3b30',
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
