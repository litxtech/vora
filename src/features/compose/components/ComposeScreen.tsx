import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { keyboardPersistPress } from '@/components/keyboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { isLocalVideoUri } from '@/lib/media/isVideoUrl';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { LocationPicker, type SelectedLocation } from '@/features/compose/components/LocationPicker';
import { useMediaEditorStore } from '@/features/compose/store/mediaEditorStore';
import { COMPOSE_DEFAULT_CATEGORY, COMPOSE_DEFAULT_CATEGORY_LABEL } from '@/features/compose/constants';
import { usePostUploadStore } from '@/features/compose/store/postUploadStore';
import {
  hydrateComposeFromSnapshot,
  isActiveComposeUploadSession,
} from '@/features/compose/services/hydrateComposeFromSnapshot';
import type { PostAudience } from '@/features/profile/services/audienceFilter';
import { MusicAttributionBadge } from '@/features/music/components/MusicAttributionBadge';
import { MusicMarqueeOverlay } from '@/features/music/components/MusicMarqueeOverlay';
import { AudioPickerSheet } from '@/features/sounds/components/AudioPickerSheet';
import { ComposePhotoMusicEditor } from '@/features/compose/components/ComposePhotoMusicEditor';
import { PostUploadProgressPanel } from '@/features/compose/components/PostUploadProgressPanel';
import { useMusicSelectionStore } from '@/features/music/store/musicSelectionStore';
import type { MusicSelection } from '@/features/music/types';
import { photoPostMusicEndSec } from '@/features/music/utils/formatMusicTime';
import { SyncedVideoPreview } from '@/features/vora-studio/components/SyncedVideoPreview';
import { useStudioExportStore } from '@/features/vora-studio/store/studioExportStore';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { ComposeHashtagSuggestions } from '@/features/agenda/components/ComposeHashtagSuggestions';
import { FEED_FILTERS } from '@/features/feed/constants';
import { REGIONS } from '@/constants/regions';
import type { RegionId } from '@/constants/regions';
import type { PostCategory } from '@/types/database';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { COMPOSE_FEATURE } from '@/features/compose/featureFlags';

const CATEGORIES = FEED_FILTERS.filter(
  (f) => !['all', 'reels', 'following'].includes(f.id),
).map((f) => ({
  id: f.id as PostCategory,
  label: f.label,
}));

const AUDIENCE_OPTIONS: { id: PostAudience; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'public', label: 'Herkese', icon: 'earth-outline' },
  { id: 'friends', label: 'Arkadaş', icon: 'people-outline' },
  { id: 'close_friends', label: 'Yakın', icon: 'heart-outline' },
];

const MAX_VIDEO_DURATION_SEC = 90;
const MAX_MEDIA_COUNT = 4;

function ComposeVideoPreview({
  uri,
  music,
  editManifest,
}: {
  uri: string;
  music?: ReturnType<typeof useMusicSelectionStore.getState>['selection'];
  editManifest?: ReturnType<typeof useStudioExportStore.getState>['editManifest'];
}) {
  return <SyncedVideoPreview uri={uri} music={music} editManifest={editManifest} style={styles.thumb} autoPlay />;
}

type AttachButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
};

function AttachButton({ icon, label, color, onPress, disabled, active }: AttachButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[
        styles.attachBtn,
        {
          borderColor: active ? color : colors.border,
          backgroundColor: active ? `${color}14` : colors.surface,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={20} color={active ? color : colors.textSecondary} />
      <Text variant="caption" style={{ color: active ? color : colors.textSecondary, fontSize: 11 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ComposeScreen() {
  const params = useLocalSearchParams<{
    editedUri?: string | string[];
    mediaUris?: string | string[];
    content?: string | string[];
    fromEditor?: string | string[];
    communityId?: string | string[];
    communityName?: string | string[];
  }>();
  const editedUri = Array.isArray(params.editedUri) ? params.editedUri[0] : params.editedUri;
  const initialMediaUris = Array.isArray(params.mediaUris) ? params.mediaUris[0] : params.mediaUris;
  const initialContent = Array.isArray(params.content) ? params.content[0] : params.content;
  const fromEditor = Array.isArray(params.fromEditor) ? params.fromEditor[0] : params.fromEditor;
  const communityId = Array.isArray(params.communityId) ? params.communityId[0] : params.communityId;
  const communityName = Array.isArray(params.communityName) ? params.communityName[0] : params.communityName;

  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const discoverVisible = useFeatureVisible('discover');
  const showPhoto = useFeatureVisible(COMPOSE_FEATURE.photo);
  const showVideo = useFeatureVisible(COMPOSE_FEATURE.video);
  const showMusic = useFeatureVisible(COMPOSE_FEATURE.music);
  const showLocationAttach = useFeatureVisible(COMPOSE_FEATURE.location);
  const showOptionsPanel = useFeatureVisible(COMPOSE_FEATURE.options);
  const musicSelection = useMusicSelectionStore((s) => s.selection);
  const setMusicSelection = useMusicSelectionStore((s) => s.setSelection);
  const clearMusicSelection = useMusicSelectionStore((s) => s.clearSelection);
  const editManifest = useStudioExportStore((s) => s.editManifest);
  const clearExport = useStudioExportStore((s) => s.clearExport);

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [locationText, setLocationText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [category, setCategory] = useState<PostCategory | null>(null);
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [audience, setAudience] = useState<PostAudience>('public');
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [showLocation, setShowLocation] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const handledUploadStatus = useRef<string>('idle');

  const uploadStatus = usePostUploadStore((s) => s.status);
  const uploadProgress = usePostUploadStore((s) => s.progress);
  const uploadMessage = usePostUploadStore((s) => s.message);
  const uploadEtaSec = usePostUploadStore((s) => s.etaSec);
  const uploadResult = usePostUploadStore((s) => s.result);
  const composeSnapshot = usePostUploadStore((s) => s.composeSnapshot);
  const videoUploadActive = usePostUploadStore((s) => s.videoUploadActive);
  const startUpload = usePostUploadStore((s) => s.startUpload);
  const cancelUpload = usePostUploadStore((s) => s.cancelUpload);
  const dismissUpload = usePostUploadStore((s) => s.dismiss);

  const regionId = (profile?.region_id ?? 'trabzon') as RegionId;
  const district = profile?.district ?? null;
  const regionLabel = communityName
    ? communityName
    : `${REGIONS.find((r) => r.id === regionId)?.name ?? regionId}${district ? ` · ${district}` : ''}`;

  const hasVideo = mediaUris.some((uri) => isLocalVideoUri(uri));
  const remainingSlots = MAX_MEDIA_COUNT - mediaUris.length;
  const isBackgroundUploading = uploadStatus === 'uploading' || videoUploadActive;
  const canSubmit =
    (content.trim().length > 0 || mediaUris.length > 0) && !isBackgroundUploading;

  const appendHashtag = useCallback((tag: string) => {
    const normalized = tag.replace(/^#/, '').trim();
    if (!normalized) return;
    setContent((prev) => {
      const pattern = new RegExp(`#${normalized}\\b`, 'iu');
      if (pattern.test(prev)) return prev;
      const prefix = prev.trim().length > 0 && !prev.endsWith(' ') ? `${prev} ` : prev;
      return `${prefix}#${normalized} `;
    });
  }, []);

  useEffect(() => {
    if (!editedUri) return;
    setMediaUris((prev) => {
      const withoutVideos = prev.filter((uri) => !isLocalVideoUri(uri));
      return [...withoutVideos, editedUri].slice(0, MAX_MEDIA_COUNT);
    });
  }, [editedUri]);

  useEffect(() => {
    if (!initialMediaUris) return;
    const uris = initialMediaUris.split(',').filter(Boolean);
    if (!uris.length) return;
    setMediaUris(uris.slice(0, MAX_MEDIA_COUNT));
  }, [initialMediaUris]);

  useEffect(() => {
    if (!initialContent?.trim()) return;
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    if (fromEditor !== '1') return;
    const editorLocation = useMediaEditorStore.getState().selectedLocation;
    if (editorLocation) {
      setSelectedLocation(editorLocation);
      setShowLocation(true);
    }
  }, [fromEditor]);

  useEffect(() => {
    if (selectedLocation) setShowLocation(true);
  }, [selectedLocation]);

  const applyComposeSnapshot = useCallback(() => {
    if (!composeSnapshot) return;
    if (!isActiveComposeUploadSession(uploadStatus, videoUploadActive, composeSnapshot)) return;

    const form = hydrateComposeFromSnapshot(composeSnapshot);
    setContent(form.content);
    setTitle(form.title);
    setLocationText(form.locationText);
    setSelectedLocation(form.selectedLocation);
    setCategory(form.category);
    setMediaUris(form.mediaUris);
    setAudience(form.audience);
    setShowLocation(form.showLocation);
  }, [composeSnapshot, uploadStatus, videoUploadActive]);

  useFocusEffect(
    useCallback(() => {
      applyComposeSnapshot();
    }, [applyComposeSnapshot]),
  );

  const finishAfterShare = (resultCommunityId?: string | null) => {
    clearMusicSelection();
    clearExport();
    useMediaEditorStore.getState().reset();
    dismissUpload();
    if (resultCommunityId) {
      router.replace(`/communities/${resultCommunityId}` as never);
    } else {
      router.dismissTo('/(tabs)' as Href);
    }
  };

  useEffect(() => {
    if (handledUploadStatus.current === uploadStatus) return;

    if (uploadStatus === 'success' && uploadResult) {
      if (videoUploadActive) {
        handledUploadStatus.current = uploadStatus;
        return;
      }
      handledUploadStatus.current = uploadStatus;
      const sharedToReels = !!uploadResult.reelId && hasVideo;
      Alert.alert(
        uploadResult.pendingReview ? 'İnceleme bekliyor' : 'Paylaşıldı',
        uploadResult.pendingReview
          ? 'Gönderiniz şüpheli içerik olarak işaretlendi ve moderasyon onayından sonra yayınlanacak.'
          : uploadResult.videoProcessing
            ? 'Gönderiniz yayında. Video arka planda işleniyor; birkaç dakika içinde oynatılabilir olacak.'
            : sharedToReels
              ? 'Gönderiniz akışa eklendi ve video otomatik olarak Reels\'te de yayınlandı.'
              : uploadResult.communityId
                ? 'Gönderiniz toplulukta yayınlandı.'
                : 'Gönderiniz akışa eklendi.',
        [{ text: 'Tamam', onPress: () => finishAfterShare(uploadResult.communityId) }],
      );
      return;
    }

    if (uploadStatus === 'error') {
      handledUploadStatus.current = uploadStatus;
      Alert.alert('Hata', uploadMessage || 'Paylaşım başarısız.');
      return;
    }

    if (uploadStatus === 'cancelled') {
      handledUploadStatus.current = uploadStatus;
      dismissUpload();
    }
  }, [
    uploadStatus,
    uploadResult,
    uploadMessage,
    videoUploadActive,
    hasVideo,
    dismissUpload,
  ]);

  const pickImages = async () => {
    if (remainingSlots <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri).slice(0, MAX_MEDIA_COUNT - mediaUris.length);
      const combined = [...mediaUris, ...uris].slice(0, MAX_MEDIA_COUNT);
      router.push({
        pathname: '/media-editor',
        params: { mediaUris: combined.join(','), mediaType: 'image' },
      } as never);
    }
  };

  const openPhotoEditor = () => {
    const photoUris = mediaUris.filter((uri) => !isLocalVideoUri(uri));
    if (!photoUris.length) return;
    router.push({
      pathname: '/media-editor',
      params: { mediaUris: photoUris.join(','), mediaType: 'image' },
    } as never);
  };

  const handleMusicSelect = (selection: MusicSelection) => {
    setMusicSelection({
      ...selection,
      musicStartSec: 0,
      musicEndSec: photoPostMusicEndSec(0, selection.durationSec),
      musicVolume: 0.85,
      originalAudioVolume: 0,
    });
    setMusicOpen(false);
  };

  const pickVideo = async () => {
    if (remainingSlots <= 0) return;
    if (hasVideo) {
      Alert.alert('Tek video', 'Gönderiye en fazla bir video ekleyebilirsiniz.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Video seçmek için galeri izni vermelisiniz.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      videoMaxDuration: MAX_VIDEO_DURATION_SEC,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      router.push({
        pathname: '/media-editor',
        params: { mediaUris: result.assets[0].uri, mediaType: 'video' },
      } as never);
    }
  };

  const handleSubmit = async () => {
    if (!(await requireAuth('Paylaşım'))) return;
    if (!user) return;
    if (!content.trim() && mediaUris.length === 0) {
      Alert.alert('Eksik', 'Metin veya medya eklemelisiniz.');
      return;
    }

    const resolvedLabel = (selectedLocation?.label ?? locationText).trim() || null;

    const input = {
      authorId: user.id,
      regionId,
      district,
      locationLabel: resolvedLabel,
      locationSource: selectedLocation?.source,
      locationGeocodeHint: selectedLocation?.geocodeHint ?? null,
      locationSuggestionRegionId: selectedLocation?.suggestionRegionId,
      locationMapboxId: selectedLocation?.mapboxId ?? null,
      locationSessionToken: selectedLocation?.sessionToken ?? null,
      title: title.trim() || null,
      content: content.trim(),
      category: category ?? COMPOSE_DEFAULT_CATEGORY,
      mediaUris,
      audience,
      latitude: selectedLocation?.latitude ?? null,
      longitude: selectedLocation?.longitude ?? null,
      music: musicSelection,
      editManifest,
      communityId: communityId ?? null,
    };

    handledUploadStatus.current = 'uploading';
    startUpload(input, mediaUris[0] ?? null);
    router.dismissTo('/(tabs)' as Href);
  };

  const handleBack = () => {
    if (isBackgroundUploading) {
      Alert.alert(
        'Arka planda yükleniyor',
        'Gönderiniz yüklenmeye devam edecek. Akıştaki üst çubuktan durumu takip edebilirsiniz.',
        [
          { text: 'Kal', style: 'cancel' },
          { text: 'Ayrıl', onPress: () => router.back() },
        ],
      );
      return;
    }
    router.back();
  };

  const handleCancelUpload = () => {
    Alert.alert('Yüklemeyi iptal et', 'Video yüklemesi durdurulacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: () => {
          handledUploadStatus.current = 'cancelled';
          cancelUpload();
        },
      },
    ]);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleBack} hitSlop={12} style={styles.topSide}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>

          <View style={styles.topCenter}>
            <Text variant="label">{communityId ? 'Toplulukta paylaş' : 'Yeni gönderi'}</Text>
            <Text secondary variant="caption" numberOfLines={1}>
              {regionLabel}
            </Text>
          </View>

          <Pressable
            {...keyboardPersistPress(handleSubmit)}
            disabled={!canSubmit}
            style={[styles.shareBtn, { backgroundColor: canSubmit ? colors.primary : colors.border }]}
          >
            {isBackgroundUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.shareBtnText}>Paylaş</Text>
            )}
          </Pressable>
        </View>

        {isBackgroundUploading ? (
          <View style={styles.uploadPanelWrap}>
            <PostUploadProgressPanel
              progress={uploadProgress}
              message={uploadMessage}
              etaSec={uploadEtaSec}
              onCancel={handleCancelUpload}
              compact
            />
          </View>
        ) : null}

        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
          bottomOffset={24}
        >
          <View style={[styles.composeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.contentInput, { color: colors.text }]}
              placeholder="Ne oluyor? #hashtag kullanabilirsin"
              placeholderTextColor={colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={2000}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TextInput
              style={[styles.titleInput, { color: colors.textSecondary }]}
              placeholder="Başlık (isteğe bağlı)"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={120}
            />
          </View>

          {discoverVisible ? (
            <ComposeHashtagSuggestions
              regionId={regionId}
              content={content}
              onAppendTag={appendHashtag}
            />
          ) : null}

          {mediaUris.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
              {mediaUris.map((uri, i) => {
                const isVideo = isLocalVideoUri(uri);
                return (
                  <View key={`${uri}-${i}`} style={styles.mediaWrap}>
                    <Pressable onPress={() => setPreviewIndex(i)}>
                      {isVideo ? (
                        <View style={styles.videoThumb}>
                          <ComposeVideoPreview uri={uri} music={musicSelection} editManifest={editManifest} />
                          <View style={styles.playOverlay}>
                            <Ionicons name="play" size={18} color="#fff" />
                          </View>
                        </View>
                      ) : (
                        <View style={styles.photoThumb}>
                          <Image source={{ uri }} style={styles.thumb} />
                          {musicSelection && !hasVideo ? (
                            <View style={styles.thumbMusicOverlay} pointerEvents="none">
                              <MusicMarqueeOverlay music={musicSelection} maxWidth={72} />
                            </View>
                          ) : null}
                        </View>
                      )}
                    </Pressable>
                    {isVideo ? (
                      <Pressable
                        style={[styles.mediaAction, styles.mediaEdit, { backgroundColor: colors.primary }]}
                        onPress={() =>
                          router.push({
                            pathname: '/vora-studio',
                            params: { sourceUri: uri, mode: 'post' },
                          } as never)
                        }
                      >
                        <Ionicons name="cut-outline" size={12} color="#fff" />
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[styles.mediaAction, styles.mediaEdit, { backgroundColor: colors.primary }]}
                        onPress={openPhotoEditor}
                      >
                        <Ionicons name="create-outline" size={12} color="#fff" />
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.mediaAction, styles.mediaRemove, { backgroundColor: colors.danger }]}
                      onPress={() => setMediaUris((p) => p.filter((_, j) => j !== i))}
                    >
                      <Ionicons name="close" size={12} color="#fff" />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          ) : null}

          {hasVideo ? (
            <Text secondary variant="caption" style={styles.hint}>
              Video içeren gönderiler Reels'te de yayınlanır.
            </Text>
          ) : null}

          {musicSelection && !hasVideo ? (
            <ComposePhotoMusicEditor
              music={musicSelection}
              onUpdate={(patch) => setMusicSelection(musicSelection ? { ...musicSelection, ...patch } : null)}
              onRemove={clearMusicSelection}
              onChangeTrack={() => setMusicOpen(true)}
            />
          ) : musicSelection && hasVideo ? (
            <View style={styles.musicBadgeWrap}>
              <MusicAttributionBadge
                music={{
                  trackId: musicSelection.trackId,
                  displayTitle: musicSelection.displayTitle,
                  artist: musicSelection.artist,
                }}
              />
              <Pressable onPress={clearMusicSelection} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.attachRow}>
            {showPhoto ? (
              <AttachButton
                icon="images-outline"
                label="Fotoğraf"
                color={colors.primary}
                onPress={pickImages}
                disabled={remainingSlots <= 0}
              />
            ) : null}
            {showVideo ? (
              <AttachButton
                icon="videocam-outline"
                label="Video"
                color={colors.accent}
                onPress={pickVideo}
                disabled={remainingSlots <= 0 || hasVideo}
              />
            ) : null}
            {!hasVideo && mediaUris.length > 0 && showMusic ? (
              <AttachButton
                icon="musical-notes-outline"
                label="Müzik"
                color={colors.accent}
                onPress={() => setMusicOpen(true)}
                active={!!musicSelection}
              />
            ) : null}
            {showLocationAttach ? (
              <AttachButton
                icon="location-outline"
                label="Konum"
                color={colors.accent}
                onPress={() => setShowLocation((v) => !v)}
                active={showLocation || !!selectedLocation}
              />
            ) : null}
            {showOptionsPanel ? (
              <AttachButton
                icon="options-outline"
                label="Ayarlar"
                color={colors.primary}
                onPress={() => setShowOptions((v) => !v)}
                active={showOptions}
              />
            ) : null}
          </View>

          {showLocationAttach && showLocation ? (
            <View style={[styles.section, { borderColor: colors.border, backgroundColor: `${colors.surface}AA` }]}>
              <LocationPicker
                regionId={regionId}
                value={selectedLocation}
                onChange={setSelectedLocation}
                onTextChange={setLocationText}
                compact
              />
            </View>
          ) : null}

          {showOptionsPanel && showOptions ? (
            <View style={[styles.section, { borderColor: colors.border, backgroundColor: `${colors.surface}AA` }]}>
              <Text variant="caption" secondary style={styles.sectionLabel}>
                Kimler görebilir?
              </Text>
              <View style={styles.chipRow}>
                {AUDIENCE_OPTIONS.map((opt) => {
                  const active = audience === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setAudience(opt.id)}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? colors.accent : colors.border,
                          backgroundColor: active ? `${colors.accent}18` : 'transparent',
                        },
                      ]}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={13}
                        color={active ? colors.accent : colors.textMuted}
                      />
                      <Text
                        variant="caption"
                        style={{ color: active ? colors.accent : colors.textSecondary, fontSize: 12 }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text variant="caption" secondary style={styles.sectionLabel}>
                Kategori
              </Text>
              <Text variant="caption" secondary style={styles.categoryHint}>
                Seçilmezse {COMPOSE_DEFAULT_CATEGORY_LABEL} olarak paylaşılır
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {CATEGORIES.map((cat) => {
                  const active = category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setCategory(active ? null : cat.id)}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? `${colors.primary}18` : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={{ color: active ? colors.primary : colors.textSecondary, fontSize: 12 }}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {showOptionsPanel && !showOptions ? (
            <View style={styles.summaryRow}>
              <Pressable style={styles.summaryChip} onPress={() => setShowOptions(true)}>
                <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
                <Text variant="caption" secondary>
                  {AUDIENCE_OPTIONS.find((o) => o.id === audience)?.label}
                </Text>
              </Pressable>
              <Text variant="caption" secondary>
                ·
              </Text>
              <Pressable style={styles.summaryChip} onPress={() => setShowOptions(true)}>
                <Ionicons name="pricetag-outline" size={13} color={colors.textMuted} />
                <Text variant="caption" secondary>
                  {category
                    ? CATEGORIES.find((c) => c.id === category)?.label
                    : `${COMPOSE_DEFAULT_CATEGORY_LABEL} (varsayılan)`}
                </Text>
              </Pressable>
              {selectedLocation ? (
                <>
                  <Text variant="caption" secondary>
                    ·
                  </Text>
                  <Pressable style={styles.summaryChip} onPress={() => setShowLocation(true)}>
                    <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                    <Text variant="caption" secondary numberOfLines={1}>
                      {selectedLocation.label}
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : null}

        </KeyboardAwareScrollView>

        <FullScreenMediaViewer
          urls={mediaUris}
          visible={previewIndex !== null}
          startIndex={previewIndex ?? 0}
          onClose={() => setPreviewIndex(null)}
        />

        <AudioPickerSheet
          visible={musicOpen}
          selectedTrackId={musicSelection?.trackId ?? null}
          onClose={() => setMusicOpen(false)}
          onSelect={handleMusicSelect}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  topSide: { width: 72, alignItems: 'flex-start' },
  topCenter: { flex: 1, alignItems: 'center' },
  shareBtn: {
    minWidth: 72,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  shareBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  uploadPanelWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  scroll: { flex: 1 },
  page: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  composeCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  contentInput: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    minHeight: 88,
    maxHeight: 160,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.md },
  titleInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    fontWeight: '500',
  },
  mediaRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  mediaWrap: { position: 'relative' },
  photoThumb: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  thumbMusicOverlay: {
    position: 'absolute',
    left: 2,
    right: 2,
    bottom: 2,
  },
  videoThumb: { width: 72, height: 72, borderRadius: radius.md, overflow: 'hidden' },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  mediaAction: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaRemove: { top: -4, right: -4 },
  mediaEdit: { bottom: -4, left: -4 },
  attachRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  attachBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  section: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  sectionLabel: { marginBottom: -4 },
  categoryHint: { marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '45%',
  },
  hint: { marginTop: -4 },
  musicBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
