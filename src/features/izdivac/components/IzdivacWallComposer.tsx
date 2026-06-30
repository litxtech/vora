import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { IzdivacFormSheet, IzdivacSheetPrimaryButton } from '@/features/izdivac/components/IzdivacFormSheet';
import {
  IZDIVAC_ACCENT,
  IZDIVAC_INVITE_TEMPLATES,
  IZDIVAC_WALL_MAX_MEDIA,
  IZDIVAC_WALL_VIDEO_MAX_DURATION_SEC,
} from '@/features/izdivac/constants';
import { createIzdivacPost } from '@/features/izdivac/services/izdivacEcosystem';
import {
  type IzdivacWallPendingMedia,
  uploadIzdivacWallMediaBatch,
} from '@/features/izdivac/services/izdivacMediaUpload';
import { isLocalVideoUri } from '@/lib/media/isVideoUrl';
import { prepareLocalImageUri } from '@/lib/media/prepareLocalImage';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  onPosted: () => void;
};

function assetToPending(asset: ImagePicker.ImagePickerAsset): IzdivacWallPendingMedia {
  const isVideo = asset.type === 'video' || isLocalVideoUri(asset.uri);
  return {
    uri: asset.uri,
    kind: isVideo ? 'video' : 'image',
    mimeType: asset.mimeType ?? null,
    durationMs: asset.duration ?? undefined,
  };
}

export function IzdivacWallComposer({ onPosted }: Props) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [body, setBody] = useState('');
  const [media, setMedia] = useState<IzdivacWallPendingMedia[]>([]);
  const [isInvite, setIsInvite] = useState(false);
  const [whenLabel, setWhenLabel] = useState('');
  const [whereLabel, setWhereLabel] = useState('');
  const [openSpace, setOpenSpace] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStage, setUploadStage] = useState<string | null>(null);

  const hasVideo = media.some((item) => item.kind === 'video');
  const remainingSlots = IZDIVAC_WALL_MAX_MEDIA - media.length;
  const canSubmit = body.trim().length > 0 || media.length > 0;

  const glass = useMemo(
    () => ({
      inset: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)',
      border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)',
    }),
    [isDark],
  );

  const applyTemplate = (template: string) => {
    setBody(template);
    setIsInvite(true);
  };

  const closeSheet = () => {
    if (submitting) return;
    setSheetOpen(false);
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const ensureLibraryPermission = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Galeri izni', 'Fotoğraf veya video eklemek için galeri erişimi gerekli.');
      return false;
    }
    return true;
  };

  const pickImages = async () => {
    if (!remainingSlots || hasVideo) return;
    if (!(await ensureLibraryPermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.9,
      copyToCacheDirectory: true,
    });

    if (result.canceled || result.assets.length === 0) return;

    const next: IzdivacWallPendingMedia[] = [];
    for (const asset of result.assets.slice(0, remainingSlots)) {
      try {
        const stableUri = await prepareLocalImageUri(asset.uri, asset.mimeType);
        next.push({ ...assetToPending(asset), uri: stableUri });
      } catch {
        Alert.alert('Fotoğraf', 'Seçilen fotoğraf okunamadı. Lütfen tekrar deneyin.');
        return;
      }
    }
    setMedia((prev) => [...prev, ...next].slice(0, IZDIVAC_WALL_MAX_MEDIA));
  };

  const pickVideo = async () => {
    if (media.length > 0) {
      Alert.alert('Video', 'Video paylaşımında yalnızca tek video ekleyebilirsiniz.');
      return;
    }
    if (!(await ensureLibraryPermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      quality: 0.85,
      copyToCacheDirectory: true,
      videoMaxDuration: IZDIVAC_WALL_VIDEO_MAX_DURATION_SEC,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const durationMs = asset.duration ?? 0;
    if (durationMs > IZDIVAC_WALL_VIDEO_MAX_DURATION_SEC * 1000) {
      Alert.alert(
        'Video çok uzun',
        `İzdivaç videoları en fazla ${Math.floor(IZDIVAC_WALL_VIDEO_MAX_DURATION_SEC / 60)} dakika olabilir.`,
      );
      return;
    }

    setMedia([assetToPending(asset)]);
  };

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed && media.length === 0) {
      Alert.alert('Paylaşım', 'Bir metin yazın veya medya ekleyin.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Oturum', 'Paylaşım için giriş yapmalısınız.');
      return;
    }

    setSubmitting(true);
    setUploadStage(media.length > 0 ? 'Medyalar yükleniyor…' : null);

    let mediaUrls: string[] = [];
    if (media.length > 0) {
      const upload = await uploadIzdivacWallMediaBatch(user.id, media);
      if (upload.error) {
        setSubmitting(false);
        setUploadStage(null);
        Alert.alert('Yükleme başarısız', upload.error);
        return;
      }
      mediaUrls = upload.urls;
    }

    setUploadStage('Paylaşım yayınlanıyor…');

    const kind = isInvite ? 'invite' : mediaUrls.length > 0 && !trimmed ? 'media' : 'share';
    const { error } = await createIzdivacPost({
      body: trimmed,
      kind,
      mediaUrls,
      inviteMeta: isInvite
        ? {
            when: whenLabel.trim() || null,
            where: whereLabel.trim() || null,
            activity: trimmed,
          }
        : null,
      openSpace: isInvite && openSpace,
    });

    setSubmitting(false);
    setUploadStage(null);

    if (error) {
      Alert.alert('Paylaşılamadı', error);
      return;
    }

    setBody('');
    setMedia([]);
    setWhenLabel('');
    setWhereLabel('');
    setIsInvite(false);
    setSheetOpen(false);
    onPosted();
  };

  const inputStyle = [
    styles.input,
    {
      color: colors.text,
      borderColor: colors.border,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.surface,
    },
  ];

  return (
    <>
      <Pressable
        onPress={() => setSheetOpen(true)}
        style={[
          styles.collapsed,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="create-outline" size={15} color={IZDIVAC_ACCENT} />
        <Text secondary variant="caption" style={{ flex: 1, fontSize: 11 }}>
          Paylaş, fotoğraf/video veya davet oluştur…
        </Text>
        <Ionicons name="chevron-up" size={14} color={colors.textMuted} />
      </Pressable>

      <IzdivacFormSheet
        visible={sheetOpen}
        title={isInvite ? 'Davet oluştur' : 'Duvara paylaş'}
        subtitle="Yalnızca İzdivaç üyeleri görür."
        onClose={closeSheet}
        footer={
          <IzdivacSheetPrimaryButton
            label={uploadStage ?? (isInvite ? 'Daveti paylaş' : 'Paylaş')}
            onPress={() => void submit()}
            loading={submitting}
            disabled={!canSubmit}
          />
        }
      >
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Ne paylaşmak istiyorsunuz?"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          style={[inputStyle, styles.bodyInput]}
        />

        <View style={styles.mediaToolbar}>
          <Pressable
            onPress={() => void pickImages()}
            disabled={hasVideo || remainingSlots <= 0}
            style={({ pressed }) => [
              styles.mediaBtn,
              { backgroundColor: glass.inset, borderColor: glass.border },
              (hasVideo || remainingSlots <= 0) && styles.mediaBtnDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="image-outline" size={16} color={IZDIVAC_ACCENT} />
            <Text variant="caption" style={{ fontSize: 11, fontWeight: '600' }}>
              Fotoğraf
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void pickVideo()}
            disabled={media.length > 0}
            style={({ pressed }) => [
              styles.mediaBtn,
              { backgroundColor: glass.inset, borderColor: glass.border },
              media.length > 0 && styles.mediaBtnDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="videocam-outline" size={16} color={IZDIVAC_ACCENT} />
            <Text variant="caption" style={{ fontSize: 11, fontWeight: '600' }}>
              Video
            </Text>
          </Pressable>
          {media.length > 0 ? (
            <Text secondary variant="caption" style={styles.mediaHint}>
              {hasVideo ? '1 video' : `${media.length}/${IZDIVAC_WALL_MAX_MEDIA} fotoğraf`}
            </Text>
          ) : null}
        </View>

        {media.length > 0 ? (
          <View style={styles.mediaPreviewRow}>
            {media.map((item, index) => (
              <View key={`${item.uri}-${index}`} style={[styles.mediaThumbWrap, { borderColor: glass.border }]}>
                <Image source={{ uri: item.uri }} style={styles.mediaThumb} />
                {item.kind === 'video' ? (
                  <View style={styles.videoBadge}>
                    <Ionicons name="play" size={12} color="#fff" />
                  </View>
                ) : null}
                <Pressable
                  onPress={() => removeMedia(index)}
                  style={styles.removeMediaBtn}
                  hitSlop={8}
                  accessibilityLabel="Medyayı kaldır"
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.templateRow}>
          {IZDIVAC_INVITE_TEMPLATES.map((t) => (
            <Pressable
              key={t}
              onPress={() => applyTemplate(t)}
              style={[styles.templateChip, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.surface }]}
            >
              <Text variant="caption" style={{ fontSize: 10 }} numberOfLines={2}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text variant="caption" style={{ fontSize: 11 }}>
            Davet olarak paylaş
          </Text>
          <Switch value={isInvite} onValueChange={setIsInvite} trackColor={{ true: IZDIVAC_ACCENT }} />
        </View>

        {isInvite ? (
          <>
            <TextInput
              value={whenLabel}
              onChangeText={setWhenLabel}
              placeholder="Ne zaman? (ör. bugün akşam)"
              placeholderTextColor={colors.textMuted}
              style={inputStyle}
            />
            <TextInput
              value={whereLabel}
              onChangeText={setWhereLabel}
              placeholder="Nerede? (opsiyonel)"
              placeholderTextColor={colors.textMuted}
              style={inputStyle}
            />
            <View style={styles.switchRow}>
              <Text variant="caption" style={{ fontSize: 11 }}>
                Görüşme odası aç
              </Text>
              <Switch value={openSpace} onValueChange={setOpenSpace} trackColor={{ true: IZDIVAC_ACCENT }} />
            </View>
          </>
        ) : null}
      </IzdivacFormSheet>
    </>
  );
}

const styles = StyleSheet.create({
  collapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
  bodyInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  mediaToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mediaBtnDisabled: {
    opacity: 0.45,
  },
  mediaHint: {
    fontSize: 10,
    marginLeft: 'auto',
  },
  mediaPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  mediaThumbWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radius.full,
  },
  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  templateChip: {
    width: '48%',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 34,
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  pressed: { opacity: 0.82 },
});
