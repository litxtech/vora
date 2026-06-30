import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { createReel } from '@/features/reels/services/createReel';
import { useMusicSelectionStore } from '@/features/music/store/musicSelectionStore';
import { SyncedVideoPreview } from '@/features/vora-studio/components/SyncedVideoPreview';
import { useStudioExportStore } from '@/features/vora-studio/store/studioExportStore';
import { MusicAttributionBadge } from '@/features/music/components/MusicAttributionBadge';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { REGIONS } from '@/constants/regions';
import type { RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

const MAX_DURATION_SEC = 90;

function VideoPreview({
  uri,
  music,
  editManifest,
}: {
  uri: string;
  music?: ReturnType<typeof useMusicSelectionStore.getState>['selection'];
  editManifest?: ReturnType<typeof useStudioExportStore.getState>['editManifest'];
}) {
  return (
    <SyncedVideoPreview uri={uri} music={music} editManifest={editManifest} style={styles.previewVideo} autoPlay />
  );
}

export function CreateReelScreen() {
  const params = useLocalSearchParams<{ editedUri?: string | string[] }>();
  const editedUri = Array.isArray(params.editedUri) ? params.editedUri[0] : params.editedUri;

  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const musicSelection = useMusicSelectionStore((s) => s.selection);
  const clearMusicSelection = useMusicSelectionStore((s) => s.clearSelection);
  const editManifest = useStudioExportStore((s) => s.editManifest);
  const clearExport = useStudioExportStore((s) => s.clearExport);

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const regionId = (profile?.region_id ?? 'trabzon') as RegionId;
  const regionName = REGIONS.find((r) => r.id === regionId)?.name ?? regionId;

  useEffect(() => {
    if (editedUri) setVideoUri(editedUri);
  }, [editedUri]);

  const pickVideo = async (source: 'library' | 'camera') => {
    if (!(await requireAuth('Reel paylaşımı'))) return;

    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Video seçmek için galeri/kamera izni vermelisiniz.');
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['videos'],
            videoMaxDuration: MAX_DURATION_SEC,
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            videoMaxDuration: MAX_DURATION_SEC,
            quality: 1,
          });

    if (!result.canceled && result.assets[0]?.uri) {
      router.push({
        pathname: '/vora-studio',
        params: { sourceUri: result.assets[0].uri, mode: 'reel' },
      } as never);
    }
  };

  const handleSubmit = async () => {
    if (!(await requireAuth('Reel paylaşımı'))) return;
    if (!user) return;

    if (!videoUri) {
      Alert.alert('Video gerekli', 'Paylaşmak için bir video seçin veya çekin.');
      return;
    }

    setSubmitting(true);
    setStatusMessage('');

    const { reelId, error } = await createReel(
      {
        authorId: user.id,
        regionId,
        videoUri,
        caption,
        music: musicSelection,
        editManifest,
      },
      (_stage, message) => {
        if (message) setStatusMessage(message);
      },
    );

    setSubmitting(false);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    Alert.alert('Paylaşıldı', 'Reel\'iniz yayında!', [
      {
        text: 'Reels\'e git',
        onPress: () => {
          clearMusicSelection();
          clearExport();
          router.replace('/(tabs)/reels' as never);
          void reelId;
        },
      },
    ]);
  };

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        bottomOffset={40}
      >
        <AuthHeader title="Reel Paylaş" subtitle={`${regionName} · max ${MAX_DURATION_SEC} sn`} />

        {videoUri ? (
          <View style={styles.previewWrap}>
            <VideoPreview uri={videoUri} music={musicSelection} editManifest={editManifest} />
            <Pressable
              style={styles.editVideo}
              onPress={() =>
                router.push({
                  pathname: '/vora-studio',
                  params: { sourceUri: videoUri, mode: 'reel' },
                } as never)
              }
            >
              <Ionicons name="cut-outline" size={22} color="#fff" />
            </Pressable>
            <Pressable style={styles.removeVideo} onPress={() => setVideoUri(null)}>
              <Ionicons name="close-circle" size={28} color={colors.danger} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.pickRow}>
            <Pressable
              style={[styles.pickBtn, { borderColor: colors.border, backgroundColor: `${colors.surface}CC` }]}
              onPress={() => pickVideo('library')}
            >
              <Ionicons name="film-outline" size={28} color={colors.primary} />
              <Text variant="label">Galeriden seç</Text>
              <Text secondary variant="caption">
                Max {MAX_DURATION_SEC} saniye
              </Text>
            </Pressable>
            <Pressable
              style={[styles.pickBtn, { borderColor: colors.border, backgroundColor: `${colors.surface}CC` }]}
              onPress={() => pickVideo('camera')}
            >
              <Ionicons name="videocam-outline" size={28} color={colors.accent} />
              <Text variant="label">Video çek</Text>
              <Text secondary variant="caption">
                Dikey video önerilir
              </Text>
            </Pressable>
          </View>
        )}

        <TextInput
          style={[styles.captionInput, { color: colors.text, borderColor: colors.border, backgroundColor: `${colors.surface}88` }]}
          placeholder="Açıklama ekle... #hashtag kullanabilirsin"
          placeholderTextColor={colors.textMuted}
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={500}
        />

        {musicSelection ? (
          <View style={styles.musicBadge}>
            <MusicAttributionBadge
              music={{
                trackId: musicSelection.trackId,
                displayTitle: musicSelection.displayTitle,
                artist: musicSelection.artist,
              }}
            />
            <Pressable onPress={clearMusicSelection}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        {statusMessage ? (
          <Text secondary variant="caption">
            {statusMessage}
          </Text>
        ) : null}

        <Button
          title={submitting ? 'Paylaşılıyor...' : 'Reel Paylaş'}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!videoUri || submitting}
        />

        <Button title="Vazgeç" variant="outline" onPress={() => router.back()} disabled={submitting} />
      </KeyboardAwareScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  pickRow: { flexDirection: 'row', gap: spacing.sm },
  pickBtn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  previewWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    height: 320,
    position: 'relative',
  },
  previewVideo: { width: '100%', height: '100%' },
  editVideo: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.full,
    padding: 8,
  },
  removeVideo: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  captionInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 96,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  musicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
});
