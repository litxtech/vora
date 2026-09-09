import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { getVideoMetaData } from 'react-native-compressor';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Text } from '@/components/ui/Text';
import { CapClipVideo } from '@/features/caps/components/CapClipVideo';
import { CapOverlayLayer } from '@/features/caps/components/CapOverlayLayer';
import { CapsStudioFilmstrip } from '@/features/caps/components/studio/CapsStudioFilmstrip';
import { CapsStudioJumpBar } from '@/features/caps/components/studio/CapsStudioJumpBar';
import { CapsStudioTextPanel } from '@/features/caps/components/studio/CapsStudioTextPanel';
import { CapsStudioVoraPicker } from '@/features/caps/components/studio/CapsStudioVoraPicker';
import {
  CAP_CLIP_LENGTH_OPTIONS,
  CAP_DEFAULT_CLIP_SEC,
  CAPS_BUCKET,
  CAPS_STUDIO_TITLE,
  MAX_CAP_UPLOAD_BYTES,
} from '@/features/caps/constants';
import { normalizeVideoDurationMs } from '@/features/caps/services/capDuration';
import { createCapFromStudio } from '@/features/caps/services/capsStudioData';
import type {
  CapOverlayStyle,
  CapsStudioClipLengthSec,
  CapsStudioSource,
  CapVoraVideoOption,
} from '@/features/caps/types';
import { getLocalFileSize, normalizeLocalFileUri, readLocalFileBytes } from '@/lib/files/readLocalFile';
import { prepareLocalVideoUri } from '@/lib/video/prepareLocalVideo';
import { compressVideoForUpload } from '@/lib/video/compress';
import { supabase } from '@/lib/supabase/client';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

export function CapsStudioScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [source, setSource] = useState<CapsStudioSource | null>(null);
  const [clipSec, setClipSec] = useState<CapsStudioClipLengthSec>(CAP_DEFAULT_CLIP_SEC);
  const [windowStartMs, setWindowStartMs] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [overlay, setOverlay] = useState<CapOverlayStyle>({
    color: '#FFFFFF',
    effect: 'shadow',
    fontFamily: 'system',
  });
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [voraOpen, setVoraOpen] = useState(false);

  const clipLengthMs = clipSec * 1000;
  const isPhoto = source?.kind === 'photo';
  const isVideo = source?.kind === 'local_video' || source?.kind === 'vora_video';
  const durationMs = isVideo ? source.durationMs : 0;
  const endMs = Math.min(durationMs, windowStartMs + clipLengthMs);

  const previewUri = useMemo(() => {
    if (!source) return null;
    if (source.kind === 'photo') return source.localUri;
    if (source.kind === 'local_video') return source.localUri;
    return source.playbackUrl;
  }, [source]);

  const setClipLength = (sec: CapsStudioClipLengthSec) => {
    setClipSec(sec);
    if (!source || source.kind === 'photo') return;
    const maxStart = Math.max(0, source.durationMs - sec * 1000);
    setWindowStartMs((prev) => Math.min(prev, maxStart));
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Galeri erişimine izin verin.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.92,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    setSource({
      kind: 'photo',
      localUri: normalizeLocalFileUri(asset.uri),
      width: asset.width,
      height: asset.height,
    });
    setPlaying(false);
  };

  const pickLocalVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Galeri erişimine izin verin.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    try {
      const stable = await prepareLocalVideoUri(normalizeLocalFileUri(result.assets[0].uri), {
        forceCopy: true,
      });
      const meta = await getVideoMetaData(stable);
      const ms = normalizeVideoDurationMs(Number(meta?.duration ?? 0));
      if (ms <= 0) {
        Alert.alert('Hata', 'Video süresi okunamadı.');
        return;
      }
      setSource({
        kind: 'local_video',
        localUri: stable,
        durationMs: ms,
        width: Number(meta?.width) || null,
        height: Number(meta?.height) || null,
      });
      setWindowStartMs(0);
      setClipSec(CAP_DEFAULT_CLIP_SEC);
      setPlaying(true);
    } catch (err) {
      Alert.alert('Video açılamadı', String(err));
    }
  };

  const selectVora = (video: CapVoraVideoOption) => {
    setSource({
      kind: 'vora_video',
      videoId: video.videoId,
      playbackUrl: video.playbackUrl,
      playbackId: video.playbackId,
      thumbnailUrl: video.thumbnailUrl,
      durationMs: video.durationMs,
      title: video.title,
    });
    setWindowStartMs(0);
    setClipSec(CAP_DEFAULT_CLIP_SEC);
    setPlaying(true);
    if (video.title) setTitle(video.title);
  };

  const handleSourceMenu = () => {
    Alert.alert('İçerik seç', undefined, [
      { text: 'Fotoğraf', onPress: () => void pickPhoto() },
      { text: 'Galeriden video', onPress: () => void pickLocalVideo() },
      { text: 'Vora videosu', onPress: () => setVoraOpen(true) },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  const jumpTo = (ms: number) => {
    if (!source || source.kind === 'photo') return;
    const maxStart = Math.max(0, source.durationMs - clipLengthMs);
    const next = Math.min(maxStart, Math.max(0, ms));
    setWindowStartMs(next);
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Giriş gerekli');
      return;
    }
    if (!source) {
      Alert.alert('İçerik seçin', 'Fotoğraf, video veya Vora videosu seçin.');
      return;
    }

    setSaving(true);
    try {
      if (source.kind === 'photo') {
        const { cap, error } = await createCapFromStudio({
          userId: user.id,
          title: title.trim() || null,
          sourceKind: 'photo',
          photoUri: source.localUri,
          startMs: 0,
          endMs: 0,
          overlay,
          width: source.width,
          height: source.height,
        });
        setSaving(false);
        if (error || !cap) {
          Alert.alert('Hata', error ?? 'Caps kaydedilemedi');
          return;
        }
        Alert.alert('Hazır', 'Caps kütüphanenize eklendi.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
        return;
      }

      if (source.kind === 'vora_video') {
        const { cap, error } = await createCapFromStudio({
          userId: user.id,
          title: title.trim() || source.title || null,
          sourceKind: 'vora_video',
          sourceVideoId: source.videoId,
          playbackUrl: source.playbackUrl,
          muxThumbUrl: source.thumbnailUrl,
          startMs: windowStartMs,
          endMs,
          overlay,
        });
        setSaving(false);
        if (error || !cap) {
          Alert.alert('Hata', error ?? 'Caps kaydedilemedi');
          return;
        }
        Alert.alert('Hazır', 'Caps kaydedildi — video yeniden kesilmedi.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
        return;
      }

      // local_video: kesmeden yükle (sıkıştır), start/end meta
      let uploadUri = source.localUri;
      try {
        uploadUri = await compressVideoForUpload(source.localUri, { profile: 'story' });
      } catch {
        uploadUri = source.localUri;
      }
      const size = getLocalFileSize(uploadUri);
      if (size <= 0 || size > MAX_CAP_UPLOAD_BYTES) {
        setSaving(false);
        Alert.alert(
          'Video çok büyük',
          'Uzun galeri videoları için Vora’ya yükleyip “Vora videosu” seçin. Caps, videoyu kesmeden yalnızca aralığı kaydeder.',
        );
        return;
      }

      const path = `${user.id}/${Date.now()}_full.mp4`;
      const bytes = await readLocalFileBytes(uploadUri);
      const { error: upErr } = await supabase.storage.from(CAPS_BUCKET).upload(path, bytes, {
        contentType: 'video/mp4',
        upsert: false,
      });
      if (upErr) {
        setSaving(false);
        Alert.alert('Hata', upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from(CAPS_BUCKET).getPublicUrl(path);

      const { cap, error } = await createCapFromStudio({
        userId: user.id,
        title: title.trim() || null,
        sourceKind: 'local_video',
        localVideoUri: source.localUri,
        localVideoPublicUrl: pub.publicUrl,
        localVideoStoragePath: path,
        startMs: windowStartMs,
        endMs,
        overlay,
        width: source.width,
        height: source.height,
      });
      setSaving(false);
      if (error || !cap) {
        Alert.alert('Hata', error ?? 'Caps kaydedilemedi');
        return;
      }
      Alert.alert('Hazır', 'Caps kaydedildi — yalnızca seçilen aralık oynatılır.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } catch (err) {
      setSaving(false);
      Alert.alert('Hata', String(err));
    }
  };

  return (
    <GradientBackground>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <AuthHeader title={CAPS_STUDIO_TITLE} />
        <ScrollView
          contentContainerStyle={[
            styles.body,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={handleSourceMenu}
            style={[styles.preview, { backgroundColor: 'transparent' }]}
          >
            {source?.kind === 'photo' && previewUri ? (
              <View style={styles.previewInner}>
                <Image source={{ uri: previewUri }} style={styles.fill} contentFit="contain" />
                <CapOverlayLayer overlay={overlay} />
              </View>
            ) : source && isVideo && previewUri ? (
              <View style={styles.previewInner}>
                <CapClipVideo
                  videoUrl={previewUri}
                  posterUrl={source.kind === 'vora_video' ? source.thumbnailUrl : null}
                  startMs={windowStartMs}
                  endMs={endMs}
                  playing={playing}
                  style={styles.fill}
                  contentFit="contain"
                />
                <CapOverlayLayer overlay={overlay} />
                <Pressable
                  style={styles.playBtn}
                  onPress={() => setPlaying((p) => !p)}
                  hitSlop={8}
                >
                  <Ionicons name={playing ? 'pause' : 'play'} size={22} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="film-outline" size={36} color={colors.textMuted} />
                <Text secondary>Fotoğraf / Video / Vora videosu seç</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.sourceRow}>
            <Pressable
              onPress={() => void pickPhoto()}
              style={[styles.sourceBtn, { backgroundColor: colors.surfaceElevated }]}
            >
              <Ionicons name="image-outline" size={18} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                Fotoğraf
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void pickLocalVideo()}
              style={[styles.sourceBtn, { backgroundColor: colors.surfaceElevated }]}
            >
              <Ionicons name="videocam-outline" size={18} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                Video
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVoraOpen(true)}
              style={[styles.sourceBtn, { backgroundColor: colors.surfaceElevated }]}
            >
              <Ionicons name="planet-outline" size={18} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                Vora
              </Text>
            </Pressable>
          </View>

          {isVideo ? (
            <>
              <CapsStudioJumpBar
                currentMs={windowStartMs}
                durationMs={durationMs}
                onJumpMs={jumpTo}
              />
              <CapsStudioFilmstrip
                localUri={source.kind === 'local_video' ? source.localUri : null}
                muxPlaybackId={source.kind === 'vora_video' ? source.playbackId : null}
                durationMs={durationMs}
                windowStartMs={windowStartMs}
                clipLengthMs={clipLengthMs}
                onSeekMs={() => undefined}
                onWindowStartMsChange={setWindowStartMs}
              />
              <View style={styles.clipRow}>
                <Text variant="caption" secondary>
                  Caps aralığı
                </Text>
                <View style={styles.clipChips}>
                  {CAP_CLIP_LENGTH_OPTIONS.map((sec) => (
                    <Pressable
                      key={sec}
                      onPress={() => setClipLength(sec)}
                      style={[
                        styles.clipChip,
                        {
                          backgroundColor: clipSec === sec ? colors.primary : colors.surfaceElevated,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={{
                          color: clipSec === sec ? '#fff' : colors.text,
                          fontWeight: '700',
                        }}
                      >
                        {sec} sn
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Text variant="caption" secondary style={{ textAlign: 'center' }}>
                Seçili: {Math.round(windowStartMs / 1000)}s → {Math.round(endMs / 1000)}s · video
                kesilmez
              </Text>
            </>
          ) : null}

          <CapsStudioTextPanel overlay={overlay} onChange={setOverlay} />

          <TextInput
            style={[
              styles.titleInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surfaceElevated,
              },
            ]}
            placeholder="Başlık (isteğe bağlı)"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />

          <Pressable
            onPress={() => void handleSave()}
            disabled={saving || !source}
            style={[
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: saving || !source ? 0.5 : 1 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Kaydet</Text>
            )}
          </Pressable>
          <View style={styles.secondaryRow}>
            <Pressable
              onPress={() => void handleSave()}
              disabled={saving || !source}
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
            >
              <Text style={{ fontWeight: '700', color: colors.text }}>Paylaş</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                Alert.alert('Taslak', 'Caps kaydedilince kütüphanenize eklenir. İstediğiniz zaman paylaşabilirsiniz.')
              }
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
            >
              <Text style={{ fontWeight: '700', color: colors.text }}>Taslak</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      <CapsStudioVoraPicker
        visible={voraOpen}
        onClose={() => setVoraOpen(false)}
        onSelect={selectVora}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 360,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  previewInner: { flex: 1, width: '100%', height: '100%' },
  fill: { width: '100%', height: '100%' },
  placeholder: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  playBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceRow: { flexDirection: 'row', gap: spacing.sm },
  sourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  clipRow: { gap: spacing.xs },
  clipChips: { flexDirection: 'row', gap: spacing.xs },
  clipChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  titleInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  saveBtn: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryRow: { flexDirection: 'row', gap: spacing.sm },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
