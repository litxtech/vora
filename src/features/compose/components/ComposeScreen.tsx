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
import { prepareStoryVideoPreviewUri } from '@/features/stories/services/prepareStoryVideoPreview';
import { useMediaHandoffStore } from '@/features/compose/store/mediaHandoffStore';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
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
import { useLockStackBackGesture } from '@/features/music/hooks/useLockStackBackGesture';
import { useMusicSelectionStore } from '@/features/music/store/musicSelectionStore';
import type { MusicSelection } from '@/features/music/types';
import { photoPostMusicEndSec } from '@/features/music/utils/formatMusicTime';
import { SyncedVideoPreview } from '@/features/vora-studio/components/SyncedVideoPreview';
import { useStudioExportStore } from '@/features/vora-studio/store/studioExportStore';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { ComposeHashtagSuggestions } from '@/features/agenda/components/ComposeHashtagSuggestions';
import { ComposerLinkPreview } from '@/features/richtext';
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
  const videoMuted = useMediaEditorStore((s) => s.videoMuted);
  return (
    <SyncedVideoPreview
      uri={uri}
      music={music}
      muted={videoMuted}
      editManifest={editManifest}
      style={styles.thumb}
      autoPlay
    />
  );
}

type ToolbarIconProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  color?: string;
};

function ToolbarIcon({ icon, onPress, disabled, active, color }: ToolbarIconProps) {
  const { colors } = useTheme();
  const tint = active ? (color ?? colors.primary) : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={[styles.toolbarIcon, disabled && styles.toolbarIconDisabled]}
    >
      <Ionicons name={icon} size={24} color={active ? tint : colors.primary} />
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
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
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
  useLockStackBackGesture(Boolean(musicSelection) && !hasVideo);
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
    const handoff = useMediaHandoffStore.getState().payload;
    if (handoff?.mediaUris?.length) {
      setMediaUris(handoff.mediaUris.slice(0, MAX_MEDIA_COUNT));
      useMediaHandoffStore.getState().clearHandoff();
      return;
    }
    if (!initialMediaUris) return;
    const uris = initialMediaUris.split(',').filter(Boolean);
    if (!uris.length) return;
    setMediaUris(uris.slice(0, MAX_MEDIA_COUNT));
  }, [initialMediaUris, fromEditor]);

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
      useMediaHandoffStore.getState().setHandoff({
        mediaUris: combined,
        mediaType: 'image',
      });
      router.push({
        pathname: '/media-editor',
        params: { handoff: '1', mediaType: 'image' },
      } as never);
    }
  };

  const openPhotoEditor = () => {
    const photoUris = mediaUris.filter((uri) => !isLocalVideoUri(uri));
    if (!photoUris.length) return;
    useMediaHandoffStore.getState().setHandoff({
      mediaUris: photoUris,
      mediaType: 'image',
    });
    router.push({
      pathname: '/media-editor',
      params: { handoff: '1', mediaType: 'image' },
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
      try {
        const playableUri = await prepareStoryVideoPreviewUri(result.assets[0].uri);
        useMediaHandoffStore.getState().setHandoff({
          mediaUris: [playableUri],
          mediaType: 'video',
        });
        router.push({
          pathname: '/media-editor',
          params: { handoff: '1', mediaType: 'video' },
        } as never);
      } catch (err) {
        Alert.alert(
          'Video hazırlanamadı',
          err instanceof Error ? err.message : 'Lütfen tekrar deneyin.',
        );
      }
    }
  };

  const openCamera = () => {
    router.push({
      pathname: '/capture',
      params: { mode: 'post' },
    } as never);
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
      videoMuted: hasVideo && useMediaEditorStore.getState().videoMuted,
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
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} hitSlop={14} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>

          <Pressable
            {...keyboardPersistPress(handleSubmit)}
            disabled={!canSubmit}
            style={[
              styles.shareBtn,
              { backgroundColor: canSubmit ? colors.primary : `${colors.primary}55` },
            ]}
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
          bottomOffset={72}
        >
          <View style={styles.composerRow}>
            <ProfileAvatar
              username={profile?.username ?? 'u'}
              avatarUrl={profile?.avatar_url ?? null}
              size={44}
            />

            <View style={styles.composerBody}>
              {showOptionsPanel ? (
                <Pressable
                  onPress={() => setShowOptions((v) => !v)}
                  style={[
                    styles.audienceChip,
                    { borderColor: colors.primary, backgroundColor: `${colors.primary}12` },
                  ]}
                >
                  <Ionicons
                    name={AUDIENCE_OPTIONS.find((o) => o.id === audience)?.icon ?? 'earth-outline'}
                    size={13}
                    color={colors.primary}
                  />
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
                    {AUDIENCE_OPTIONS.find((o) => o.id === audience)?.label}
                  </Text>
                  <Ionicons name="chevron-down" size={13} color={colors.primary} />
                </Pressable>
              ) : null}

              <TextInput
                style={[styles.contentInput, { color: colors.text }]}
                placeholder={communityId ? 'Toplulukta ne paylaşmak istersin?' : 'Ne oluyor?'}
                placeholderTextColor={colors.textMuted}
                value={content}
                onChangeText={setContent}
                multiline
                maxLength={2000}
                autoFocus
              />

              <View style={styles.linkPreviewWrap}>
                <ComposerLinkPreview content={content} />
              </View>

              <TextInput
                style={[styles.titleInput, { color: colors.textSecondary }]}
                placeholder="Başlık ekle (isteğe bağlı)"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />

              <Text secondary variant="caption" style={styles.regionHint} numberOfLines={1}>
                {regionLabel}
              </Text>
            </View>
          </View>

          <View style={styles.mediaStrip}>
            <View style={styles.mediaStripHeader}>
              <Text secondary variant="caption" style={styles.mediaStripLabel}>
                Medya
              </Text>
              <Text secondary variant="caption">
                {remainingSlots}/{MAX_MEDIA_COUNT}
              </Text>
            </View>

            <View style={styles.mediaChipRow}>
              <Pressable
                onPress={() => setShowGalleryPicker((v) => !v)}
                disabled={remainingSlots <= 0 || (!showPhoto && !showVideo)}
                style={[
                  styles.mediaChip,
                  {
                    borderColor: showGalleryPicker ? colors.primary : colors.border,
                    backgroundColor: showGalleryPicker ? `${colors.primary}12` : colors.surface,
                  },
                  (remainingSlots <= 0 || (!showPhoto && !showVideo)) && styles.mediaBtnDisabled,
                ]}
              >
                <Ionicons
                  name="images-outline"
                  size={16}
                  color={showGalleryPicker ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.mediaChipText,
                    { color: showGalleryPicker ? colors.primary : colors.text },
                  ]}
                >
                  Galeri
                </Text>
                <Ionicons
                  name={showGalleryPicker ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={colors.textMuted}
                />
              </Pressable>

              <Pressable
                onPress={openCamera}
                disabled={remainingSlots <= 0 || (!showPhoto && !showVideo)}
                style={[
                  styles.mediaChip,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  (remainingSlots <= 0 || (!showPhoto && !showVideo)) && styles.mediaBtnDisabled,
                ]}
              >
                <Ionicons name="camera-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.mediaChipText, { color: colors.text }]}>Kamera</Text>
              </Pressable>
            </View>

            {showGalleryPicker ? (
              <View style={styles.mediaChoiceRow}>
                {showPhoto ? (
                  <Pressable
                    onPress={pickImages}
                    disabled={remainingSlots <= 0}
                    style={[
                      styles.mediaChoiceBtn,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      remainingSlots <= 0 && styles.mediaBtnDisabled,
                    ]}
                  >
                    <Ionicons name="image-outline" size={15} color={colors.primary} />
                    <Text style={[styles.mediaChoiceText, { color: colors.text }]}>Resim</Text>
                  </Pressable>
                ) : null}
                {showVideo ? (
                  <Pressable
                    onPress={pickVideo}
                    disabled={remainingSlots <= 0 || hasVideo}
                    style={[
                      styles.mediaChoiceBtn,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      (remainingSlots <= 0 || hasVideo) && styles.mediaBtnDisabled,
                    ]}
                  >
                    <Ionicons name="film-outline" size={15} color={colors.primary} />
                    <Text style={[styles.mediaChoiceText, { color: colors.text }]}>Video</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          {discoverVisible ? (
            <ComposeHashtagSuggestions
              regionId={regionId}
              content={content}
              onAppendTag={appendHashtag}
            />
          ) : null}

          {mediaUris.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaRow}
            >
              {mediaUris.map((uri, i) => {
                const isVideo = isLocalVideoUri(uri);
                return (
                  <View key={`${uri}-${i}`} style={styles.mediaWrap}>
                    <Pressable onPress={() => setPreviewIndex(i)}>
                      {isVideo ? (
                        <View style={[styles.videoThumb, { borderColor: colors.border }]}>
                          <ComposeVideoPreview uri={uri} music={musicSelection} editManifest={editManifest} />
                          <View style={styles.playOverlay}>
                            <Ionicons name="play" size={22} color="#fff" />
                          </View>
                        </View>
                      ) : (
                        <View style={styles.photoThumb}>
                          <Image
                            source={{ uri }}
                            style={[styles.thumb, { borderColor: colors.border }]}
                          />
                          {musicSelection && !hasVideo ? (
                            <View style={styles.thumbMusicOverlay} pointerEvents="none">
                              <MusicMarqueeOverlay music={musicSelection} maxWidth={100} />
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
                        <Ionicons name="cut-outline" size={13} color="#fff" />
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[styles.mediaAction, styles.mediaEdit, { backgroundColor: colors.primary }]}
                        onPress={openPhotoEditor}
                      >
                        <Ionicons name="create-outline" size={13} color="#fff" />
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.mediaAction, styles.mediaRemove, { backgroundColor: colors.danger }]}
                      onPress={() => setMediaUris((p) => p.filter((_, j) => j !== i))}
                    >
                      <Ionicons name="close" size={13} color="#fff" />
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
                  durationSec: Math.max(0, musicSelection.musicEndSec - musicSelection.musicStartSec) || musicSelection.durationSec,
                }}
              />
              <Pressable onPress={clearMusicSelection} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : null}

          {showLocationAttach && showLocation ? (
            <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <LocationPicker
                regionId={regionId}
                value={selectedLocation}
                onChange={setSelectedLocation}
                onTextChange={setLocationText}
                compact
                scope="world"
              />
            </View>
          ) : null}

          {showOptionsPanel && showOptions ? (
            <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.surface }]}>
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
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? `${colors.primary}18` : 'transparent',
                        },
                      ]}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={13}
                        color={active ? colors.primary : colors.textMuted}
                      />
                      <Text
                        variant="caption"
                        style={{ color: active ? colors.primary : colors.textSecondary, fontSize: 12 }}
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

          {showOptionsPanel && !showOptions && (category || selectedLocation) ? (
            <View style={styles.summaryRow}>
              {category ? (
                <Pressable style={styles.summaryChip} onPress={() => setShowOptions(true)}>
                  <Ionicons name="pricetag-outline" size={13} color={colors.textMuted} />
                  <Text variant="caption" secondary>
                    {CATEGORIES.find((c) => c.id === category)?.label}
                  </Text>
                </Pressable>
              ) : null}
              {selectedLocation ? (
                <Pressable style={styles.summaryChip} onPress={() => setShowLocation(true)}>
                  <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                  <Text variant="caption" secondary numberOfLines={1}>
                    {selectedLocation.label}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </KeyboardAwareScrollView>

        <View style={[styles.toolbar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {!hasVideo && mediaUris.length > 0 && showMusic ? (
            <ToolbarIcon
              icon="musical-notes-outline"
              onPress={() => setMusicOpen(true)}
              active={!!musicSelection}
            />
          ) : null}
          {showLocationAttach ? (
            <ToolbarIcon
              icon="location-outline"
              onPress={() => setShowLocation((v) => !v)}
              active={showLocation || !!selectedLocation}
            />
          ) : null}
          {showOptionsPanel ? (
            <ToolbarIcon
              icon="options-outline"
              onPress={() => setShowOptions((v) => !v)}
              active={showOptions}
            />
          ) : null}

          <View style={styles.toolbarSpacer} />
          <Text secondary variant="caption" style={styles.charCount}>
            {content.length}/2000
          </Text>
        </View>

        <FullScreenMediaViewer
          urls={mediaUris}
          visible={previewIndex !== null}
          startIndex={previewIndex ?? 0}
          onClose={() => setPreviewIndex(null)}
        />

        <AudioPickerSheet
          visible={musicOpen}
          selectedTrackId={musicSelection?.trackId ?? null}
          selectionMode
          tapToSelect
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    minWidth: 88,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  shareBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  uploadPanelWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  scroll: { flex: 1 },
  page: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  composerBody: {
    flex: 1,
    gap: spacing.xs,
  },
  audienceChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  contentInput: {
    minHeight: 120,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '400',
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  linkPreviewWrap: {
    marginHorizontal: -8,
    marginTop: 4,
    marginBottom: 4,
  },
  titleInput: {
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 2,
  },
  regionHint: {
    marginTop: 2,
  },
  mediaStrip: {
    gap: spacing.xs,
  },
  mediaStripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mediaStripLabel: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  mediaChipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  mediaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
  },
  mediaChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  mediaChoiceRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  mediaChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
  },
  mediaChoiceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mediaBtnDisabled: {
    opacity: 0.4,
  },
  mediaRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  mediaWrap: { position: 'relative' },
  photoThumb: { position: 'relative' },
  thumb: {
    width: 148,
    height: 148,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumbMusicOverlay: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
  },
  videoThumb: {
    width: 148,
    height: 148,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  mediaAction: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaRemove: { top: -6, right: -6 },
  mediaEdit: { bottom: -6, left: -6 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  toolbarIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarIconDisabled: {
    opacity: 0.35,
  },
  toolbarSpacer: { flex: 1 },
  charCount: {
    paddingRight: spacing.sm,
  },
  section: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
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
    gap: spacing.sm,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '70%',
  },
  hint: { marginTop: -4 },
  musicBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
});
