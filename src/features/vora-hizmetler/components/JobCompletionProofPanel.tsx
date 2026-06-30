import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { HizmetSectionHeader } from '@/features/vora-hizmetler/components/HizmetUi';
import {
  submitServiceCompletionProof,
  uploadCompletionProofMedia,
} from '@/features/vora-hizmetler/services/completionProof';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { VORA_HIZMETLER_FEATURE } from '@/features/vora-hizmetler/featureFlags';
import type { ServiceCompletionProof } from '@/features/vora-hizmetler/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type JobCompletionProofPanelProps = {
  requestId: string;
  userId: string;
  proof: ServiceCompletionProof;
  mode: 'submit' | 'view';
  onSubmitted?: () => void;
};

export function JobCompletionProofPanel({
  requestId,
  userId,
  proof,
  mode,
  onSubmitted,
}: JobCompletionProofPanelProps) {
  const { colors } = useTheme();
  const visible = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailCompletionProof);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  if (!visible) return null;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.85,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    let imageUrl: string | null = null;
    let videoUrl: string | null = null;

    if (imageUri) {
      const upload = await uploadCompletionProofMedia(userId, requestId, imageUri, 'image');
      if (upload.error || !upload.url) {
        setSubmitting(false);
        Alert.alert('Hata', upload.error ?? 'Fotoğraf yüklenemedi.');
        return;
      }
      imageUrl = upload.url;
    }

    if (videoUri) {
      const upload = await uploadCompletionProofMedia(userId, requestId, videoUri, 'video');
      if (upload.error || !upload.url) {
        setSubmitting(false);
        Alert.alert('Hata', upload.error ?? 'Video yüklenemedi.');
        return;
      }
      videoUrl = upload.url;
    }

    const result = await submitServiceCompletionProof(requestId, { imageUrl, videoUrl });
    setSubmitting(false);

    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }

    setImageUri(null);
    setVideoUri(null);
    onSubmitted?.();
    Alert.alert('Gönderildi', 'İş bitim kanıtınız müşteriye iletildi.');
  };

  if (mode === 'view') {
    const mediaUrls = [proof.imageUrl, proof.videoUrl].filter(Boolean) as string[];

    return (
      <>
        <GlassCard style={styles.card}>
          <HizmetSectionHeader
            title="İş Bitim Kanıtı"
            subtitle={
              mediaUrls.length
                ? 'Ustanın paylaştığı fotoğraf veya video'
                : 'Usta işi tamamladığını bildirdi'
            }
            icon="camera-outline"
          />
          {mediaUrls.length ? (
            <View style={styles.mediaRow}>
              {proof.imageUrl ? (
                <ProofThumb
                  uri={proof.imageUrl}
                  icon="image-outline"
                  label="Fotoğraf"
                  onPress={() => {
                    setViewerIndex(0);
                    setViewerVisible(true);
                  }}
                />
              ) : null}
              {proof.videoUrl ? (
                <ProofThumb
                  uri={proof.videoUrl}
                  icon="videocam-outline"
                  label="Video"
                  isVideo
                  onPress={() => {
                    setViewerIndex(proof.imageUrl ? 1 : 0);
                    setViewerVisible(true);
                  }}
                />
              ) : null}
            </View>
          ) : (
            <Text secondary variant="body">
              Usta medya paylaşmadan işi tamamladığını bildirdi. Memnunsanız İş Bitti diyerek onaylayın.
            </Text>
          )}
          {proof.submittedAt ? (
            <Text secondary variant="caption">
              {new Date(proof.submittedAt).toLocaleString('tr-TR')} tarihinde paylaşıldı
            </Text>
          ) : null}
        </GlassCard>

        {mediaUrls.length ? (
          <FullScreenMediaViewer
            urls={mediaUrls}
            visible={viewerVisible}
            startIndex={viewerIndex}
            onClose={() => setViewerVisible(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <HizmetSectionHeader
        title="İş Bitim Kanıtı"
        subtitle="Fotoğraf ve video opsiyonel — müşteri onayı için paylaşın"
        icon="cloud-upload-outline"
      />

      <View style={styles.mediaRow}>
        {imageUri ? (
          <View style={styles.mediaThumbWrap}>
            <Image source={{ uri: imageUri }} style={styles.mediaThumb} />
            <Pressable onPress={() => setImageUri(null)} style={styles.mediaRemove}>
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={pickImage} style={[styles.mediaAdd, { borderColor: colors.border }]}>
            <Ionicons name="image-outline" size={22} color={VORA_HIZMETLER_ACCENT} />
            <Text variant="caption" style={styles.mediaAddLabel}>
              Fotoğraf
            </Text>
            <Text secondary variant="caption" style={styles.optionalLabel}>
              Opsiyonel
            </Text>
          </Pressable>
        )}

        {videoUri ? (
          <View style={styles.mediaThumbWrap}>
            <View style={[styles.mediaThumb, styles.videoPlaceholder]}>
              <Ionicons name="videocam" size={28} color="#fff" />
            </View>
            <Pressable onPress={() => setVideoUri(null)} style={styles.mediaRemove}>
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={pickVideo} style={[styles.mediaAdd, { borderColor: colors.border }]}>
            <Ionicons name="videocam-outline" size={22} color={VORA_HIZMETLER_ACCENT} />
            <Text variant="caption" style={styles.mediaAddLabel}>
              Video
            </Text>
            <Text secondary variant="caption" style={styles.optionalLabel}>
              Opsiyonel
            </Text>
          </Pressable>
        )}
      </View>

      <Button
        title="Kanıtı Gönder"
        onPress={handleSubmit}
        loading={submitting}
        style={styles.submitBtn}
      />
    </GlassCard>
  );
}

function ProofThumb({
  uri,
  icon,
  label,
  isVideo,
  onPress,
}: {
  uri: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isVideo?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.proofThumbWrap}>
        {isVideo ? (
          <View style={[styles.mediaThumb, styles.videoPlaceholder]}>
            <Ionicons name="play-circle" size={32} color="#fff" />
          </View>
        ) : (
          <Image source={{ uri }} style={styles.mediaThumb} />
        )}
        <View style={styles.proofLabel}>
          <Ionicons name={icon} size={12} color="#fff" />
          <Text variant="caption" style={styles.proofLabelText}>
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mediaThumbWrap: {
    position: 'relative',
  },
  mediaThumb: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
  },
  videoPlaceholder: {
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaAdd: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  mediaAddLabel: {
    color: VORA_HIZMETLER_ACCENT,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionalLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  submitBtn: {
    marginBottom: 0,
  },
  proofThumbWrap: {
    position: 'relative',
  },
  proofLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  proofLabelText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 10,
  },
});
