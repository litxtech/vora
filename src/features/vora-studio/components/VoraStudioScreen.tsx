import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { StudioTimeline } from '@/features/vora-studio/components/StudioTimeline';
import { StudioToolbar } from '@/features/vora-studio/components/StudioToolbar';
import { StudioTextEditor } from '@/features/vora-studio/components/StudioTextEditor';
import { StudioToolSheet } from '@/features/vora-studio/components/StudioToolSheet';
import { StudioVideoPreview } from '@/features/vora-studio/components/StudioVideoPreview';
import { STUDIO_TOOLS } from '@/features/vora-studio/constants';
import { exportStudioVideo, probeVideoDuration } from '@/features/vora-studio/services/exportStudioVideo';
import { toUserFacingError } from '@/lib/errors';
import { buildMusicSelectionFromEditor } from '@/features/music/services/buildMusicSelection';
import { useMusicSelectionStore } from '@/features/music/store/musicSelectionStore';
import { buildPublishedEditManifest } from '@/features/vora-studio/services/buildPublishedEditManifest';
import { useStudioExportStore } from '@/features/vora-studio/store/studioExportStore';
import { useStudioEditorStore } from '@/features/vora-studio/store/editorStore';
import { LIVE_SUPPORT_CLIP_MAX_SEC } from '@/features/vora-studio/constants';
import { useLiveSupportPendingVideoStore } from '@/features/live-support/store/pendingVideoStore';
import type { StudioExportMode } from '@/features/vora-studio/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type StudioParams = {
  sourceUri?: string | string[];
  mode?: string | string[];
};

export function VoraStudioScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const params = useLocalSearchParams<StudioParams>();

  const sourceUri = Array.isArray(params.sourceUri) ? params.sourceUri[0] : params.sourceUri;
  const initialExportMode = (
    Array.isArray(params.mode) ? params.mode[0] : params.mode ?? 'reel'
  ) as StudioExportMode;

  const initProject = useStudioEditorStore((s) => s.initProject);
  const reset = useStudioEditorStore((s) => s.reset);
  const isPlaying = useStudioEditorStore((s) => s.isPlaying);
  const activeTool = useStudioEditorStore((s) => s.activeTool);
  const toolSheetOpen = useStudioEditorStore((s) => s.toolSheetOpen);
  const setPlaying = useStudioEditorStore((s) => s.setPlaying);
  const sourceReady = useStudioEditorStore((s) => s.sourceUri);
  const exportMode = useStudioEditorStore((s) => s.exportMode);
  const isLiveSupport = exportMode === 'live-support';

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState('');

  const username = profile?.username ?? 'kullanici';
  const activeHint = STUDIO_TOOLS.find((t) => t.id === activeTool)?.hint;

  useEffect(() => {
    if (!sourceUri) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const duration = await probeVideoDuration(sourceUri);
      if (cancelled) return;
      if (duration <= 0) {
        Alert.alert('Hata', 'Video süresi okunamadı.');
        router.back();
        return;
      }
      initProject(sourceUri, duration, initialExportMode);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      reset();
    };
  }, [sourceUri, initialExportMode, initProject, reset]);

  const togglePlay = useCallback(() => {
    setPlaying(!isPlaying);
  }, [isPlaying, setPlaying]);

  const handleExport = async () => {
    if (!user?.id) {
      Alert.alert('Giriş gerekli', 'Video düzenlemek için giriş yapmalısınız.');
      return;
    }

    if (isLiveSupport) {
      const state = useStudioEditorStore.getState();
      const clipDuration = state.trimEndSec - state.trimStartSec;
      if (clipDuration > LIVE_SUPPORT_CLIP_MAX_SEC + 0.35) {
        Alert.alert('Video çok uzun', `En fazla ${LIVE_SUPPORT_CLIP_MAX_SEC} saniye seçebilirsiniz.`);
        return;
      }

      setExporting(true);
      setStatus('');
      try {
        const result = await exportStudioVideo(user.id, username, setStatus);
        useLiveSupportPendingVideoStore.getState().setPending({
          uri: result.outputUri,
          durationSec: clipDuration,
        });
        reset();
        router.back();
      } catch (err) {
        Alert.alert(
          'Video kırpılamadı',
          toUserFacingError(err instanceof Error ? err.message : null, { fallback: 'Video işlenemedi.' }),
        );
      } finally {
        setExporting(false);
      }
      return;
    }

    setExporting(true);
    setStatus('');

    try {
      const result = await exportStudioVideo(user.id, username, setStatus);
      const editorState = useStudioEditorStore.getState();
      const selection = buildMusicSelectionFromEditor(editorState);
      useMusicSelectionStore.getState().setSelection(selection);
      useStudioExportStore.getState().setEditManifest(buildPublishedEditManifest(editorState));

      router.replace({
        pathname: initialExportMode === 'post' ? '/compose' : '/reels/create',
        params: {
          editedUri: result.outputUri,
          thumbnailUri: result.thumbnailUri ?? '',
          studioJobId: result.jobId ?? '',
        },
      } as never);
    } catch (err) {
      Alert.alert(
        'Dışa aktarma',
        toUserFacingError(err instanceof Error ? err.message : null, { fallback: 'Video işlenemedi.' }),
      );
    } finally {
      setExporting(false);
    }
  };

  if (!sourceUri) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <ScreenBackButton style={styles.errorBack} />
        <Text>Video kaynağı bulunamadı.</Text>
      </SafeAreaView>
    );
  }

  if (loading || !sourceReady) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <Text secondary>Video yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ScreenBackButton />
        <View style={styles.headerCenter}>
          <Text variant="label">{isLiveSupport ? 'Videoyu kırp' : 'VORA Studio'}</Text>
          <Text secondary variant="caption">
            {isLiveSupport ? `En fazla ${LIVE_SUPPORT_CLIP_MAX_SEC} sn` : `@${username}`}
          </Text>
        </View>
        <Pressable onPress={togglePlay} hitSlop={12} style={styles.playBtn}>
          <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={28} color={colors.primary} />
          <Text variant="caption" style={{ color: colors.primary, fontWeight: '600', fontSize: 10 }}>
            {isPlaying ? 'Dur' : 'İzle'}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.preview, activeTool === 'text' && toolSheetOpen && styles.previewHidden]}>
        <StudioVideoPreview username={username} />
      </View>

      {!toolSheetOpen && activeHint ? (
        <View style={[styles.hintBar, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}33` }]}>
          <Ionicons name="hand-left-outline" size={14} color={colors.primary} />
          <Text variant="caption" style={{ color: colors.primary, flex: 1 }}>
            {activeHint}
          </Text>
        </View>
      ) : null}

      <StudioTimeline />
      {!isLiveSupport ? <StudioToolbar /> : null}

      {status ? (
        <Text secondary variant="caption">
          {status}
        </Text>
      ) : null}

      <Button
        title={exporting ? 'İşleniyor...' : isLiveSupport ? 'Videoyu kullan' : 'Tamamla'}
        onPress={handleExport}
        loading={exporting}
        disabled={exporting}
      />

      {!isLiveSupport ? (
        <>
          <StudioTextEditor username={username} visible={activeTool === 'text' && toolSheetOpen} />
          <StudioToolSheet />
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  errorBack: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  playBtn: {
    alignItems: 'center',
    minWidth: 44,
  },
  preview: {
    flex: 1,
    minHeight: 220,
  },
  previewHidden: {
    opacity: 0,
    height: 0,
    minHeight: 0,
    flex: 0,
    overflow: 'hidden',
  },
  hintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
